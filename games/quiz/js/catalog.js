/* KOTAE!: каталог жанров и подтем.
   QCat.genres: порядок, цвет, подтемы. QCat.ready: сколько уровней подтемы готово (вопросы есть).
   Тексты: строки "id|название|описание" на каждом языке, жанр id без дефиса, подтема "жанр-подтема".
   Подтемы, завязанные на язык (слова, пословицы, буквы), в каталог не берём. */
(function(){
'use strict';

var GENRES=[
  {id:'animals',  col:'#3be8b0',subs:['fish','birds','insects','reptiles','mammals','sea','pets','dino']},
  {id:'nature',   col:'#7be36b',subs:['plants','trees','mushrooms','weather','minerals','volcanoes','oceans','biomes']},
  {id:'space',    col:'#8b7bff',subs:['solar','moonmars','stars','flight','discovery']},
  {id:'geo',      col:'#2fb8ff',subs:['countries','cities','relief','islands','wonders','flags']},
  {id:'science',  col:'#2ef2e0',subs:['physics','chemistry','body','medicine','math','scientists']},
  {id:'tech',     col:'#36d7ff',subs:['computers','internet','ai','robots','security','tools','home']},
  {id:'transport',col:'#ff9f2e',subs:['cars','moto','trains','planes','ships']},
  {id:'history',  col:'#e8b04a',subs:['ancient','medieval','warriors','pirates','discovery','modern','c20','inventions']},
  {id:'myth',     col:'#c77dff',subs:['greek','norse','slavic','egypt','eastasia','creatures']},
  {id:'art',      col:'#ff6fae',subs:['painting','sculpture','architecture','books','theatre']},
  {id:'music',    col:'#ff3d8b',subs:['classical','rock','electronic','jazz','instruments','soundtracks']},
  {id:'media',    col:'#ffd23e',subs:['movies','cartoons','scifi','heroes','filmmaking']},
  {id:'anime',    col:'#ff5fd2',subs:['classics','studios','manga','mecha']},
  {id:'games',    col:'#6cff6c',subs:['retro','consoles','heroes','series','making']},
  {id:'hobby',    col:'#ffb020',subs:['chess','board','puzzles','cards','photo']},
  {id:'japan',    col:'#ff4f6a',subs:['traditions','food','history','crafts','places']},
  {id:'food',     col:'#ff8a3d',subs:['cuisines','produce','sweets','drinks','spices']},
  {id:'sport',    col:'#4dff9a',subs:['football','olympics','motorsport','winter','combat','ballgames']},
  {id:'world',    col:'#ffc857',subs:['holidays','costumes','money','customs']}
];

/* готовые уровни: 'animals-fish':2 значит уровни 1-2 можно играть */
var READY={};

var TXT={};
TXT.ru=`
animals|Животный мир|От рыбьих жабр до следов динозавров. Кто здесь на кого похож?
animals-fish|Рыбы|Жабры, плавники и рыбы, которые удивят даже рыбаков.
animals-birds|Птицы|Клювы, перья, полёты и птицы, которые не летают.
animals-insects|Насекомые и пауки|Шесть ног, восемь ног и целый мир под лупой.
animals-reptiles|Рептилии и амфибии|Чешуя, панцири, лягушки и жизнь между сушей и водой.
animals-mammals|Млекопитающие|Шерсть, молоко и самые разные способы жить на Земле.
animals-sea|Морские обитатели|Кто скрывается в толще воды, от медуз до китов?
animals-pets|Кошки и собаки|Усы, лапы, повадки и породы.
animals-dino|Динозавры|Кости, следы и настоящие истории древних ящеров.
nature|Природа Земли|Леса, камни, погода и места, где Земля показывает характер.
nature-plants|Растения и цветы|От семени до цветка: как растения растут и выживают.
nature-trees|Деревья и леса|Листья, кора, корни и жизнь целого леса.
nature-mushrooms|Грибы|Шляпки, споры и удивительная грибная сеть.
nature-weather|Погода и климат|Облака, ветер, грозы и то, что творится в атмосфере.
nature-minerals|Камни и минералы|Кристаллы, породы и камни, спрятанные в земле.
nature-volcanoes|Вулканы и землетрясения|Магма, разломы и силы, которые двигают кору Земли.
nature-oceans|Океаны и моря|Волны, течения, глубины и устройство морей.
nature-biomes|Пустыни, джунгли и полюса|От льда до песка: кто умеет жить в крайних условиях.
space|Космос|Планеты, звёзды и аппараты, которые добирались до них.
space-solar|Солнечная система|Солнце, планеты, спутники и их орбиты.
space-moonmars|Луна и Марс|Два близких мира, по которым ездили аппараты.
space-stars|Звёзды и галактики|Как рождаются, светят и исчезают звёзды.
space-flight|Космонавтика|Ракеты, корабли и задачи полёта за атмосферу.
space-discovery|Телескопы и открытия|Линзы, зеркала и находки, изменившие взгляд на небо.
geo|География|Страны, острова, горы и карты. Проверим твой внутренний компас.
geo-countries|Страны и столицы|Границы и столицы без школьной указки над головой.
geo-cities|Города мира|Города, которые узнают по рекам, зданиям и историям.
geo-relief|Горы, реки и озёра|Вершины, русла и озёра на карте Земли.
geo-islands|Острова|От крошечных вулканических до огромных островов.
geo-wonders|Чудеса света|Сооружения и места, ради которых люди едут далеко.
geo-flags|Флаги|Цвета и символы на флагах: что они обозначают?
science|Наука|От атома до человека: как устроен мир и как мы это узнали.
science-physics|Физика|Движение, свет, тепло и странные привычки материи.
science-chemistry|Химия|Элементы и реакции без запаха школьного кабинета.
science-body|Тело человека|Органы, кости и маленькие системы большого тела.
science-medicine|Медицина|Как исследуют болезни и помогают человеку.
science-math|Математика|Числа, формы и задачи, у которых есть красивый ход.
science-scientists|Великие учёные|Люди, эксперименты и открытия, которые они сделали.
tech|Техника|Железо, сети, роботы и вещи, которые мы включаем каждый день.
tech-computers|Компьютеры|Из чего состоит компьютер и как он выполняет команды.
tech-internet|Интернет|Как данные находят дорогу между устройствами.
tech-ai|Нейросети|Как модели учатся на примерах и где могут ошибаться.
tech-robots|Роботы|Датчики, приводы и машины, которые двигаются сами.
tech-security|Кибербезопасность|Пароли, шифры и способы защитить данные.
tech-tools|Инструменты|От отвёртки до станка: почему форма решает задачу.
tech-home|Бытовая техника|Приборы дома и хитрости внутри их корпусов.
transport|Транспорт|Колёса, рельсы, крылья и корпуса. Поехали?
transport-cars|Машины|Двигатели, колёса и машины разных эпох.
transport-moto|Мотоциклы|Два колеса, мотор и история мотоциклов.
transport-trains|Поезда|Рельсы, локомотивы и длинные дороги.
transport-planes|Самолёты|Крылья, воздушный поток и жизнь в небе.
transport-ships|Корабли|Паруса, винты и суда, которым доверили океан.
history|История|Люди, вещи и решения, после которых мир уже не был прежним.
history-ancient|Древний мир|Города, державы и быт древних людей.
history-medieval|Средние века|Замки, ремёсла и жизнь в Средние века.
history-warriors|Рыцари, самураи и викинги|Доспехи, оружие и кодексы разных воинов.
history-pirates|Пираты и мореплаватели|Морские пути, корабли и жизнь пиратов.
history-discovery|Эпоха открытий|Маршруты, карты и встречи далёких земель.
history-modern|Новое время|Идеи и перемены с XVI по XIX век.
history-c20|XX век|Войны, открытия и повседневность XX века.
history-inventions|Изобретения|Когда появились вещи, без которых трудно представить быт.
myth|Мифы и легенды|Боги, чудовища и истории, которыми объясняли невозможное.
myth-greek|Греция и Рим|Герои, боги и чудовища античного Средиземноморья.
myth-norse|Скандинавия|Северные боги, великаны и миры на мировом дереве.
myth-slavic|Славяне|Существа и сюжеты славянских преданий.
myth-egypt|Египет|Боги, символы и рассказы Древнего Египта.
myth-eastasia|Китай и Япония|Драконы, духи и небесные истории Восточной Азии.
myth-creatures|Мифические существа|Кто скрывается в легендах разных народов?
art|Искусство|Картины, статуи, здания и сцена. Смотри внимательнее.
art-painting|Живопись|Краски, техники и сюжеты на холсте.
art-sculpture|Скульптура|Как камень и металл становятся фигурами.
art-architecture|Архитектура|Арки, купола и здания с собственным характером.
art-books|Литература|Авторы, сюжеты и книги, пережившие свои эпохи.
art-theatre|Театр и балет|Подмостки, маски, танец и работа за кулисами.
music|Музыка|Звуки, инструменты и люди, которые заставили их работать вместе.
music-classical|Классическая музыка|Оркестр, композиторы и музыка на бумаге.
music-rock|Рок и метал|Гитары, ритм-секция и история громкого звука.
music-electronic|Электронная музыка|Синтезаторы, семплы и звук из схем.
music-jazz|Джаз и блюз|Импровизация, свинг и история джаза и блюза.
music-instruments|Музыкальные инструменты|Как струна, воздух и мембрана превращаются в звук.
music-soundtracks|Музыка кино и игр|Зачем экрану музыка и как она меняет сцену.
media|Кино|Камера, кадр и выдуманные миры на большом экране.
media-movies|Кино|Фильмы, жанры и приёмы большого экрана.
media-cartoons|Мультфильмы|Рисунки и модели, которым подарили движение.
media-scifi|Фантастика|Миры будущего и идеи, зашитые в фантастике.
media-heroes|Супергерои|Костюмы, силы и истории героев на экране.
media-filmmaking|Как снимают кино|Камера, монтаж и люди, которых не видно в кадре.
anime|Аниме и манга|От бумажной страницы до огромного меха на экране.
anime-classics|Классика аниме|Работы, с которых многие начали знакомство с аниме.
anime-studios|Студии и режиссёры|Кто стоит за кадром.
anime-manga|Манга|Страницы, панели и приёмы японского комикса.
anime-mecha|Меха и роботы|Большие роботы и маленькие люди внутри их историй.
games|Видеоигры|Пиксели, консоли, герои и правила, которые держат нас у экрана.
games-retro|Ретро-игры|Аркадные автоматы, ранние игры и их ограничения.
games-consoles|Консоли|Железо, контроллеры и поколения приставок.
games-heroes|Игровые герои|Кто ведёт нас через игровые миры?
games-series|Жанры и серии|Как работают жанры и чем запомнились игровые серии.
games-making|Как делают игры|От прототипа до уровня, в который хочется вернуться.
hobby|Игры и хобби|Шахматы, карты, кубики и камера. Руки знают, что делать.
hobby-chess|Шахматы|Фигуры, дебюты и повороты на доске.
hobby-board|Настольные игры|Кости, поле, правила и неожиданные союзы.
hobby-puzzles|Головоломки|Логика, формы и задача, которая не сдаётся.
hobby-cards|Карточные игры|Колоды, масти и правила карточных игр.
hobby-photo|Фотография|Свет, объектив и кадр, который ты поймал.
japan|Япония|Праздники, ремёсла, еда и пейзажи Японии.
japan-traditions|Традиции и праздники|Праздничные дни, ритуалы и семейные обычаи.
japan-food|Кухня|От миски лапши до сложного обеда.
japan-history|История Японии|Эпохи, правители и повороты истории Японии.
japan-crafts|Ремёсла и искусство|Бумага, дерево, ткань и руки мастеров.
japan-places|Природа и города|Горы, острова, улицы и города Японии.
food|Еда|Что растёт, что варится и почему мир пахнет по-разному.
food-cuisines|Кухни мира|Почему похожие продукты готовят по-разному?
food-produce|Фрукты и овощи|Плоды, корнеплоды и то, что мы кладём в салат.
food-sweets|Сладости и выпечка|Тесто, сахар и десерты разных стран.
food-drinks|Чай, кофе и напитки|Лист, зерно, вода и напитки с историей.
food-spices|Специи|Семена, корни и запахи, меняющие вкус блюда.
sport|Спорт|Мячи, трассы, лёд и поединки. Готов к первому раунду?
sport-football|Футбол|Поле, правила и история игры в мяч ногами.
sport-olympics|Олимпийские игры|Дисциплины, символы и история Игр.
sport-motorsport|Автоспорт|Трассы, техника и работа команды на скорости.
sport-winter|Зимние виды|Лёд, снег, лыжи и борьба со временем.
sport-combat|Единоборства|Приёмы, правила и традиции единоборств.
sport-ballgames|Мячи и ракетки|Разные мячи и ракетки, разные способы победить.
world|Культуры мира|Праздники, одежда и привычки людей в разных уголках мира.
world-holidays|Праздники мира|Как люди празднуют важные дни в разных странах.
world-costumes|Национальные костюмы|Одежда, материалы и узоры с местной историей.
world-money|Деньги и монеты|Монеты и купюры как маленькие страницы истории.
world-customs|Обычаи и традиции|Приветствия, гости и повседневные правила разных мест.
`;

TXT.en=`
animals|Animal Kingdom|From fish gills to dinosaur tracks. Who here looks like whom?
animals-fish|Fish|Gills, fins and fish that would surprise even an angler.
animals-birds|Birds|Beaks, feathers, flight and birds that never fly.
animals-insects|Insects and Spiders|Six legs, eight legs and a whole world under the magnifier.
animals-reptiles|Reptiles and Amphibians|Scales, shells, frogs and life between land and water.
animals-mammals|Mammals|Fur, milk and very different ways to live on Earth.
animals-sea|Sea Creatures|Who hides in the deep, from jellyfish to whales?
animals-pets|Cats and Dogs|Whiskers, paws, habits and breeds.
animals-dino|Dinosaurs|Bones, tracks and true stories of ancient reptiles.
nature|Planet Earth|Forests, stones, weather and places where Earth shows its temper.
nature-plants|Plants and Flowers|From seed to flower: how plants grow and survive.
nature-trees|Trees and Forests|Leaves, bark, roots and the life of a whole forest.
nature-mushrooms|Mushrooms|Caps, spores and the hidden fungal network.
nature-weather|Weather and Climate|Clouds, wind, storms and what happens in the atmosphere.
nature-minerals|Rocks and Minerals|Crystals, rocks and stones hidden underground.
nature-volcanoes|Volcanoes and Earthquakes|Magma, faults and the forces that move the crust.
nature-oceans|Oceans and Seas|Waves, currents, depths and how seas work.
nature-biomes|Deserts, Jungles and Poles|From ice to sand: who can live in extreme places.
space|Space|Planets, stars and the machines that reached them.
space-solar|Solar System|The Sun, planets, moons and their orbits.
space-moonmars|Moon and Mars|Two nearby worlds that rovers have driven across.
space-stars|Stars and Galaxies|How stars are born, shine and fade.
space-flight|Spaceflight|Rockets, spacecraft and the job of getting past the sky.
space-discovery|Telescopes and Discoveries|Lenses, mirrors and finds that changed our view of the sky.
geo|Geography|Countries, islands, mountains and maps. Let us test your inner compass.
geo-countries|Countries and Capitals|Borders and capitals without a teacher's pointer.
geo-cities|World Cities|Cities known by their rivers, buildings and stories.
geo-relief|Mountains, Rivers and Lakes|Peaks, riverbeds and lakes on the map of the Earth.
geo-islands|Islands|From tiny volcanic dots to enormous islands.
geo-wonders|Wonders of the World|Places and buildings people travel far to see.
geo-flags|Flags|Colors and symbols on flags: what do they mean?
science|Science|From the atom to the human: how the world works and how we found out.
science-physics|Physics|Motion, light, heat and the odd habits of matter.
science-chemistry|Chemistry|Elements and reactions without the school lab smell.
science-body|Human Body|Organs, bones and the small systems of a big body.
science-medicine|Medicine|How diseases are studied and people are helped.
science-math|Mathematics|Numbers, shapes and problems with a neat solution.
science-scientists|Great Scientists|People, experiments and what they discovered.
tech|Technology|Hardware, networks, robots and things we switch on every day.
tech-computers|Computers|What a computer is made of and how it runs commands.
tech-internet|Internet|How data finds its way between devices.
tech-ai|Neural Networks|How models learn from examples and where they go wrong.
tech-robots|Robots|Sensors, motors and machines that move on their own.
tech-security|Cybersecurity|Passwords, ciphers and ways to protect data.
tech-tools|Tools|From screwdriver to lathe: why shape solves the job.
tech-home|Home Appliances|Devices at home and the tricks inside their cases.
transport|Transport|Wheels, rails, wings and hulls. Ready to go?
transport-cars|Cars|Engines, wheels and cars of different eras.
transport-moto|Motorcycles|Two wheels, an engine and the history of motorbikes.
transport-trains|Trains|Rails, locomotives and long journeys.
transport-planes|Aircraft|Wings, airflow and life in the sky.
transport-ships|Ships|Sails, propellers and vessels trusted with the ocean.
history|History|People, things and decisions after which the world was never the same.
history-ancient|Ancient World|Cities, empires and everyday life of ancient people.
history-medieval|Middle Ages|Castles, crafts and life in the Middle Ages.
history-warriors|Knights, Samurai and Vikings|Armor, weapons and the codes of different warriors.
history-pirates|Pirates and Navigators|Sea routes, ships and pirate life.
history-discovery|Age of Discovery|Routes, maps and meetings of distant lands.
history-modern|Early Modern Era|Ideas and changes from the 16th to the 19th century.
history-c20|20th Century|Wars, discoveries and everyday life of the 20th century.
history-inventions|Inventions|When the things we cannot live without appeared.
myth|Myths and Legends|Gods, monsters and the stories people used to explain the impossible.
myth-greek|Greece and Rome|Heroes, gods and monsters of the ancient Mediterranean.
myth-norse|Norse|Northern gods, giants and the worlds on the world tree.
myth-slavic|Slavic|Creatures and tales of Slavic folklore.
myth-egypt|Egypt|Gods, symbols and stories of Ancient Egypt.
myth-eastasia|China and Japan|Dragons, spirits and heavenly tales of East Asia.
myth-creatures|Mythical Creatures|Who hides in the legends of different peoples?
art|Art|Paintings, statues, buildings and the stage. Look closer.
art-painting|Painting|Paints, techniques and subjects on canvas.
art-sculpture|Sculpture|How stone and metal become figures.
art-architecture|Architecture|Arches, domes and buildings with character.
art-books|Literature|Authors, plots and books that outlived their eras.
art-theatre|Theatre and Ballet|The stage, masks, dance and work behind the scenes.
music|Music|Sounds, instruments and the people who made them work together.
music-classical|Classical Music|Orchestras, composers and music on paper.
music-rock|Rock and Metal|Guitars, the rhythm section and the history of loud sound.
music-electronic|Electronic Music|Synths, samples and sound from circuits.
music-jazz|Jazz and Blues|Improvisation, swing and the story of jazz and blues.
music-instruments|Musical Instruments|How a string, air and a membrane turn into sound.
music-soundtracks|Film and Game Music|Why the screen needs music and how it changes a scene.
media|Cinema|Camera, frame and invented worlds on the big screen.
media-movies|Movies|Films, genres and big screen tricks.
media-cartoons|Cartoons|Drawings and models brought to life.
media-scifi|Science Fiction|Future worlds and the ideas hidden in sci-fi.
media-heroes|Superheroes|Costumes, powers and hero stories on screen.
media-filmmaking|Filmmaking|Camera, editing and the people you never see in the shot.
anime|Anime and Manga|From the paper page to a giant mecha on screen.
anime-classics|Anime Classics|Works that introduced many people to anime.
anime-studios|Studios and Directors|Who stands behind the frame.
anime-manga|Manga|Pages, panels and the tricks of Japanese comics.
anime-mecha|Mecha and Robots|Giant robots and the small people inside their stories.
games|Video Games|Pixels, consoles, heroes and the rules that keep us playing.
games-retro|Retro Games|Arcade cabinets, early games and their limits.
games-consoles|Consoles|Hardware, controllers and console generations.
games-heroes|Game Heroes|Who guides us through game worlds?
games-series|Genres and Series|How genres work and what made game series memorable.
games-making|Game Development|From prototype to a level you want to replay.
hobby|Games and Hobbies|Chess, cards, dice and the camera. Hands know what to do.
hobby-chess|Chess|Pieces, openings and twists on the board.
hobby-board|Board Games|Dice, boards, rules and unexpected alliances.
hobby-puzzles|Puzzles|Logic, shapes and a problem that will not give up.
hobby-cards|Card Games|Decks, suits and the rules of card games.
hobby-photo|Photography|Light, lens and the shot you caught.
japan|Japan|Festivals, crafts, food and landscapes of Japan.
japan-traditions|Traditions and Festivals|Holidays, rituals and family customs.
japan-food|Cuisine|From a bowl of noodles to an elaborate meal.
japan-history|History of Japan|Eras, rulers and turning points of Japanese history.
japan-crafts|Crafts and Arts|Paper, wood, fabric and the hands of masters.
japan-places|Nature and Cities|Mountains, islands, streets and cities of Japan.
food|Food|What grows, what cooks and why the world smells so different.
food-cuisines|World Cuisines|Why similar ingredients are cooked so differently.
food-produce|Fruits and Vegetables|Fruits, roots and what goes into a salad.
food-sweets|Sweets and Pastry|Dough, sugar and desserts from many countries.
food-drinks|Tea, Coffee and Drinks|Leaves, beans, water and drinks with a history.
food-spices|Spices|Seeds, roots and aromas that change a dish.
sport|Sport|Balls, tracks, ice and duels. Ready for round one?
sport-football|Football|The pitch, the rules and the history of the game.
sport-olympics|Olympic Games|Events, symbols and the history of the Games.
sport-motorsport|Motorsport|Tracks, machines and teamwork at speed.
sport-winter|Winter Sports|Ice, snow, skis and the race against the clock.
sport-combat|Martial Arts|Techniques, rules and traditions of combat sports.
sport-ballgames|Balls and Rackets|Different balls, different rackets, different ways to win.
world|World Cultures|Holidays, clothing and habits of people around the world.
world-holidays|World Holidays|How people celebrate important days in different countries.
world-costumes|National Costumes|Clothes, materials and patterns with local history.
world-money|Money and Coins|Coins and banknotes as small pages of history.
world-customs|Customs and Traditions|Greetings, guests and everyday rules in different places.
`;

TXT.de=`
animals|Tierwelt|Von Fischkiemen bis zu Dinosaurierspuren. Wer ähnelt hier wem?
animals-fish|Fische|Kiemen, Flossen und Fische, die selbst Angler überraschen.
animals-birds|Vögel|Schnäbel, Federn, Flug und Vögel, die nicht fliegen.
animals-insects|Insekten und Spinnen|Sechs Beine, acht Beine und eine ganze Welt unter der Lupe.
animals-reptiles|Reptilien und Amphibien|Schuppen, Panzer, Frösche und das Leben zwischen Land und Wasser.
animals-mammals|Säugetiere|Fell, Milch und ganz verschiedene Arten, auf der Erde zu leben.
animals-sea|Meeresbewohner|Wer lebt in der Tiefe, von Quallen bis zu Walen?
animals-pets|Katzen und Hunde|Schnurrhaare, Pfoten, Gewohnheiten und Rassen.
animals-dino|Dinosaurier|Knochen, Spuren und echte Geschichten urzeitlicher Echsen.
nature|Natur der Erde|Wälder, Steine, Wetter und Orte, an denen die Erde Charakter zeigt.
nature-plants|Pflanzen und Blumen|Vom Samen zur Blüte: wie Pflanzen wachsen und überleben.
nature-trees|Bäume und Wälder|Blätter, Rinde, Wurzeln und das Leben eines ganzen Waldes.
nature-mushrooms|Pilze|Hüte, Sporen und das verborgene Pilznetz.
nature-weather|Wetter und Klima|Wolken, Wind, Gewitter und was in der Atmosphäre passiert.
nature-minerals|Gesteine und Minerale|Kristalle, Gesteine und Steine, verborgen in der Erde.
nature-volcanoes|Vulkane und Erdbeben|Magma, Verwerfungen und Kräfte, die die Erdkruste bewegen.
nature-oceans|Ozeane und Meere|Wellen, Strömungen, Tiefen und wie Meere funktionieren.
nature-biomes|Wüsten, Dschungel und Pole|Von Eis bis Sand: wer unter extremen Bedingungen lebt.
space|Weltraum|Planeten, Sterne und die Maschinen, die sie erreicht haben.
space-solar|Sonnensystem|Die Sonne, Planeten, Monde und ihre Bahnen.
space-moonmars|Mond und Mars|Zwei nahe Welten, über die schon Rover gefahren sind.
space-stars|Sterne und Galaxien|Wie Sterne entstehen, leuchten und vergehen.
space-flight|Raumfahrt|Raketen, Raumschiffe und der Weg hinaus über den Himmel.
space-discovery|Teleskope und Entdeckungen|Linsen, Spiegel und Funde, die unseren Blick auf den Himmel verändert haben.
geo|Geografie|Länder, Inseln, Berge und Karten. Testen wir deinen inneren Kompass.
geo-countries|Länder und Hauptstädte|Grenzen und Hauptstädte ohne Zeigestock.
geo-cities|Städte der Welt|Städte, die man an Flüssen, Bauten und Geschichten erkennt.
geo-relief|Berge, Flüsse und Seen|Gipfel, Flussläufe und Seen auf der Weltkarte.
geo-islands|Inseln|Von winzigen Vulkaninseln bis zu riesigen Inseln.
geo-wonders|Weltwunder|Bauwerke und Orte, für die Menschen weit reisen.
geo-flags|Flaggen|Farben und Symbole auf Flaggen: was bedeuten sie?
science|Wissenschaft|Vom Atom bis zum Menschen: wie die Welt funktioniert und wie wir es herausfanden.
science-physics|Physik|Bewegung, Licht, Wärme und die seltsamen Gewohnheiten der Materie.
science-chemistry|Chemie|Elemente und Reaktionen ohne den Geruch des Schullabors.
science-body|Menschlicher Körper|Organe, Knochen und die kleinen Systeme eines großen Körpers.
science-medicine|Medizin|Wie Krankheiten erforscht werden und wie man Menschen hilft.
science-math|Mathematik|Zahlen, Formen und Aufgaben mit einem schönen Lösungsweg.
science-scientists|Große Wissenschaftler|Menschen, Experimente und ihre Entdeckungen.
tech|Technik|Hardware, Netze, Roboter und Dinge, die wir täglich einschalten.
tech-computers|Computer|Woraus ein Computer besteht und wie er Befehle ausführt.
tech-internet|Internet|Wie Daten ihren Weg zwischen Geräten finden.
tech-ai|Neuronale Netze|Wie Modelle aus Beispielen lernen und wo sie sich irren.
tech-robots|Roboter|Sensoren, Antriebe und Maschinen, die sich selbst bewegen.
tech-security|Cybersicherheit|Passwörter, Chiffren und Wege, Daten zu schützen.
tech-tools|Werkzeuge|Vom Schraubenzieher bis zur Drehbank: warum die Form die Aufgabe löst.
tech-home|Haushaltsgeräte|Geräte zu Hause und die Tricks in ihrem Gehäuse.
transport|Verkehr|Räder, Schienen, Flügel und Rümpfe. Los geht es?
transport-cars|Autos|Motoren, Räder und Autos aus verschiedenen Epochen.
transport-moto|Motorräder|Zwei Räder, ein Motor und die Geschichte der Motorräder.
transport-trains|Züge|Schienen, Lokomotiven und lange Strecken.
transport-planes|Flugzeuge|Flügel, Luftströmung und das Leben am Himmel.
transport-ships|Schiffe|Segel, Schrauben und Schiffe, denen man den Ozean anvertraut.
history|Geschichte|Menschen, Dinge und Entscheidungen, nach denen die Welt nicht mehr dieselbe war.
history-ancient|Antike|Städte, Reiche und der Alltag der Menschen im Altertum.
history-medieval|Mittelalter|Burgen, Handwerk und das Leben im Mittelalter.
history-warriors|Ritter, Samurai und Wikinger|Rüstungen, Waffen und die Regeln verschiedener Krieger.
history-pirates|Piraten und Seefahrer|Seewege, Schiffe und das Leben der Piraten.
history-discovery|Zeitalter der Entdeckungen|Routen, Karten und Begegnungen ferner Länder.
history-modern|Frühe Neuzeit|Ideen und Umbrüche vom 16. bis zum 19. Jahrhundert.
history-c20|20. Jahrhundert|Kriege, Entdeckungen und der Alltag des 20. Jahrhunderts.
history-inventions|Erfindungen|Wann Dinge auftauchten, ohne die der Alltag kaum vorstellbar ist.
myth|Mythen und Sagen|Götter, Ungeheuer und Geschichten, mit denen man das Unmögliche erklärte.
myth-greek|Griechenland und Rom|Helden, Götter und Ungeheuer der antiken Mittelmeerwelt.
myth-norse|Nordische Mythen|Nordische Götter, Riesen und die Welten am Weltenbaum.
myth-slavic|Slawische Mythen|Wesen und Geschichten aus slawischen Sagen.
myth-egypt|Ägypten|Götter, Symbole und Erzählungen des Alten Ägypten.
myth-eastasia|China und Japan|Drachen, Geister und himmlische Geschichten Ostasiens.
myth-creatures|Fabelwesen|Wer verbirgt sich in den Legenden verschiedener Völker?
art|Kunst|Gemälde, Statuen, Gebäude und die Bühne. Schau genauer hin.
art-painting|Malerei|Farben, Techniken und Motive auf der Leinwand.
art-sculpture|Bildhauerei|Wie Stein und Metall zu Figuren werden.
art-architecture|Architektur|Bögen, Kuppeln und Gebäude mit eigenem Charakter.
art-books|Literatur|Autoren, Handlungen und Bücher, die ihre Zeit überdauert haben.
art-theatre|Theater und Ballett|Bühne, Masken, Tanz und die Arbeit hinter den Kulissen.
music|Musik|Klänge, Instrumente und die Menschen, die sie zusammenbrachten.
music-classical|Klassische Musik|Orchester, Komponisten und Musik auf Papier.
music-rock|Rock und Metal|Gitarren, Rhythmusgruppe und die Geschichte des lauten Klangs.
music-electronic|Elektronische Musik|Synthesizer, Samples und Klang aus Schaltkreisen.
music-jazz|Jazz und Blues|Improvisation, Swing und die Geschichte von Jazz und Blues.
music-instruments|Musikinstrumente|Wie Saite, Luft und Membran zu Klang werden.
music-soundtracks|Film- und Spielmusik|Warum der Bildschirm Musik braucht und wie sie eine Szene verändert.
media|Kino|Kamera, Bild und erfundene Welten auf der großen Leinwand.
media-movies|Filme|Filme, Genres und Tricks der großen Leinwand.
media-cartoons|Zeichentrick|Zeichnungen und Modelle, die zum Leben erweckt wurden.
media-scifi|Science-Fiction|Welten der Zukunft und die Ideen darin.
media-heroes|Superhelden|Kostüme, Kräfte und Heldengeschichten auf der Leinwand.
media-filmmaking|Filmemachen|Kamera, Schnitt und die Menschen, die man nie im Bild sieht.
anime|Anime und Manga|Von der Papierseite bis zum riesigen Mecha auf dem Bildschirm.
anime-classics|Anime-Klassiker|Werke, mit denen viele Anime kennengelernt haben.
anime-studios|Studios und Regisseure|Wer hinter dem Bild steht.
anime-manga|Manga|Seiten, Panels und die Tricks japanischer Comics.
anime-mecha|Mecha und Roboter|Riesige Roboter und die kleinen Menschen in ihren Geschichten.
games|Videospiele|Pixel, Konsolen, Helden und Regeln, die uns am Bildschirm halten.
games-retro|Retro-Spiele|Spielautomaten, frühe Spiele und ihre Grenzen.
games-consoles|Konsolen|Hardware, Controller und Konsolengenerationen.
games-heroes|Spielehelden|Wer führt uns durch Spielwelten?
games-series|Genres und Reihen|Wie Genres funktionieren und was Spielereihen unvergesslich machte.
games-making|Spieleentwicklung|Vom Prototyp zum Level, das man wieder spielen will.
hobby|Spiele und Hobbys|Schach, Karten, Würfel und Kamera. Die Hände wissen, was zu tun ist.
hobby-chess|Schach|Figuren, Eröffnungen und Wendungen auf dem Brett.
hobby-board|Brettspiele|Würfel, Spielbrett, Regeln und unerwartete Bündnisse.
hobby-puzzles|Rätsel|Logik, Formen und eine Aufgabe, die nicht nachgibt.
hobby-cards|Kartenspiele|Decks, Farben und die Regeln der Kartenspiele.
hobby-photo|Fotografie|Licht, Objektiv und das Bild, das du eingefangen hast.
japan|Japan|Feste, Handwerk, Essen und Landschaften Japans.
japan-traditions|Traditionen und Feste|Feiertage, Rituale und Familienbräuche.
japan-food|Küche|Von der Nudelschüssel bis zum aufwendigen Menü.
japan-history|Geschichte Japans|Epochen, Herrscher und Wendepunkte der japanischen Geschichte.
japan-crafts|Handwerk und Kunst|Papier, Holz, Stoff und die Hände der Meister.
japan-places|Natur und Städte|Berge, Inseln, Straßen und Städte Japans.
food|Essen|Was wächst, was kocht und warum die Welt so verschieden duftet.
food-cuisines|Küchen der Welt|Warum ähnliche Zutaten so verschieden gekocht werden.
food-produce|Obst und Gemüse|Früchte, Wurzeln und was in den Salat kommt.
food-sweets|Süßes und Gebäck|Teig, Zucker und Desserts aus vielen Ländern.
food-drinks|Tee, Kaffee und Getränke|Blätter, Bohnen, Wasser und Getränke mit Geschichte.
food-spices|Gewürze|Samen, Wurzeln und Aromen, die ein Gericht verändern.
sport|Sport|Bälle, Strecken, Eis und Duelle. Bereit für die erste Runde?
sport-football|Fußball|Das Feld, die Regeln und die Geschichte des Spiels.
sport-olympics|Olympische Spiele|Disziplinen, Symbole und die Geschichte der Spiele.
sport-motorsport|Motorsport|Strecken, Technik und Teamarbeit bei hohem Tempo.
sport-winter|Wintersport|Eis, Schnee, Ski und der Kampf gegen die Uhr.
sport-combat|Kampfsport|Techniken, Regeln und Traditionen des Kampfsports.
sport-ballgames|Bälle und Schläger|Verschiedene Bälle, verschiedene Schläger, verschiedene Wege zum Sieg.
world|Kulturen der Welt|Feste, Kleidung und Gewohnheiten von Menschen überall auf der Welt.
world-holidays|Feste der Welt|Wie Menschen in verschiedenen Ländern wichtige Tage feiern.
world-costumes|Trachten|Kleidung, Materialien und Muster mit örtlicher Geschichte.
world-money|Geld und Münzen|Münzen und Scheine als kleine Seiten der Geschichte.
world-customs|Bräuche und Sitten|Begrüßungen, Gäste und Alltagsregeln an verschiedenen Orten.
`;

TXT.fr=`
animals|Monde animal|Des branchies de poisson aux traces de dinosaures. Qui ressemble à qui ?
animals-fish|Poissons|Branchies, nageoires et poissons qui étonneraient même un pêcheur.
animals-birds|Oiseaux|Becs, plumes, vol et oiseaux qui ne volent pas.
animals-insects|Insectes et araignées|Six pattes, huit pattes et tout un monde sous la loupe.
animals-reptiles|Reptiles et amphibiens|Écailles, carapaces, grenouilles et vie entre terre et eau.
animals-mammals|Mammifères|Fourrure, lait et mille façons de vivre sur Terre.
animals-sea|Créatures marines|Qui se cache dans les profondeurs, des méduses aux baleines ?
animals-pets|Chats et chiens|Moustaches, pattes, habitudes et races.
animals-dino|Dinosaures|Os, empreintes et vraies histoires de reptiles anciens.
nature|Nature de la Terre|Forêts, pierres, météo et lieux où la Terre montre son caractère.
nature-plants|Plantes et fleurs|De la graine à la fleur : comment les plantes poussent et survivent.
nature-trees|Arbres et forêts|Feuilles, écorce, racines et la vie de toute une forêt.
nature-mushrooms|Champignons|Chapeaux, spores et le réseau caché des champignons.
nature-weather|Météo et climat|Nuages, vent, orages et ce qui se passe dans l'atmosphère.
nature-minerals|Roches et minéraux|Cristaux, roches et pierres cachées sous terre.
nature-volcanoes|Volcans et séismes|Magma, failles et forces qui déplacent la croûte terrestre.
nature-oceans|Océans et mers|Vagues, courants, profondeurs et fonctionnement des mers.
nature-biomes|Déserts, jungles et pôles|De la glace au sable : qui sait vivre dans les extrêmes.
space|Espace|Planètes, étoiles et machines qui les ont atteintes.
space-solar|Système solaire|Le Soleil, les planètes, les lunes et leurs orbites.
space-moonmars|Lune et Mars|Deux mondes voisins déjà parcourus par des rovers.
space-stars|Étoiles et galaxies|Comment les étoiles naissent, brillent et s'éteignent.
space-flight|Astronautique|Fusées, vaisseaux et l'art de dépasser le ciel.
space-discovery|Télescopes et découvertes|Lentilles, miroirs et trouvailles qui ont changé notre regard sur le ciel.
geo|Géographie|Pays, îles, montagnes et cartes. Testons ta boussole intérieure.
geo-countries|Pays et capitales|Frontières et capitales sans la baguette du prof.
geo-cities|Villes du monde|Des villes qu'on reconnaît à leurs fleuves, bâtiments et histoires.
geo-relief|Montagnes, fleuves et lacs|Sommets, cours d'eau et lacs sur la carte du monde.
geo-islands|Îles|Des minuscules îles volcaniques aux îles gigantesques.
geo-wonders|Merveilles du monde|Lieux et monuments pour lesquels on voyage loin.
geo-flags|Drapeaux|Couleurs et symboles des drapeaux : que signifient-ils ?
science|Sciences|De l'atome à l'humain : comment marche le monde et comment on l'a appris.
science-physics|Physique|Mouvement, lumière, chaleur et drôles d'habitudes de la matière.
science-chemistry|Chimie|Éléments et réactions sans l'odeur du labo de l'école.
science-body|Corps humain|Organes, os et petits systèmes d'un grand corps.
science-medicine|Médecine|Comment on étudie les maladies et comment on soigne.
science-math|Mathématiques|Nombres, formes et problèmes à la solution élégante.
science-scientists|Grands savants|Des personnes, des expériences et leurs découvertes.
tech|Technologie|Matériel, réseaux, robots et objets qu'on allume chaque jour.
tech-computers|Ordinateurs|De quoi est fait un ordinateur et comment il exécute les ordres.
tech-internet|Internet|Comment les données trouvent leur chemin entre les appareils.
tech-ai|Réseaux de neurones|Comment les modèles apprennent par l'exemple et où ils se trompent.
tech-robots|Robots|Capteurs, moteurs et machines qui bougent toutes seules.
tech-security|Cybersécurité|Mots de passe, chiffres et façons de protéger les données.
tech-tools|Outils|Du tournevis au tour : pourquoi la forme fait le travail.
tech-home|Électroménager|Les appareils de la maison et les astuces dans leur boîtier.
transport|Transports|Roues, rails, ailes et coques. On y va ?
transport-cars|Voitures|Moteurs, roues et voitures de toutes les époques.
transport-moto|Motos|Deux roues, un moteur et l'histoire de la moto.
transport-trains|Trains|Rails, locomotives et longs trajets.
transport-planes|Avions|Ailes, flux d'air et vie dans le ciel.
transport-ships|Navires|Voiles, hélices et bateaux à qui l'on confie l'océan.
history|Histoire|Des gens, des objets et des décisions après lesquels le monde a changé.
history-ancient|Antiquité|Villes, empires et vie quotidienne des peuples anciens.
history-medieval|Moyen Âge|Châteaux, artisanat et vie au Moyen Âge.
history-warriors|Chevaliers, samouraïs et Vikings|Armures, armes et codes de différents guerriers.
history-pirates|Pirates et navigateurs|Routes maritimes, navires et vie de pirate.
history-discovery|Grandes découvertes|Routes, cartes et rencontres de terres lointaines.
history-modern|Époque moderne|Idées et bouleversements du XVIe au XIXe siècle.
history-c20|XXe siècle|Guerres, découvertes et quotidien du XXe siècle.
history-inventions|Inventions|Quand sont apparus les objets dont on ne peut plus se passer.
myth|Mythes et légendes|Dieux, monstres et histoires pour expliquer l'impossible.
myth-greek|Grèce et Rome|Héros, dieux et monstres de la Méditerranée antique.
myth-norse|Mythes nordiques|Dieux du Nord, géants et mondes de l'arbre-monde.
myth-slavic|Mythes slaves|Créatures et récits des légendes slaves.
myth-egypt|Égypte|Dieux, symboles et récits de l'Égypte ancienne.
myth-eastasia|Chine et Japon|Dragons, esprits et récits célestes d'Asie de l'Est.
myth-creatures|Créatures mythiques|Qui se cache dans les légendes des peuples du monde ?
art|Art|Tableaux, statues, bâtiments et scène. Regarde de plus près.
art-painting|Peinture|Couleurs, techniques et sujets sur la toile.
art-sculpture|Sculpture|Comment la pierre et le métal deviennent des figures.
art-architecture|Architecture|Arcs, coupoles et bâtiments qui ont du caractère.
art-books|Littérature|Auteurs, intrigues et livres qui ont survécu à leur époque.
art-theatre|Théâtre et ballet|Scène, masques, danse et travail en coulisses.
music|Musique|Sons, instruments et personnes qui les ont fait jouer ensemble.
music-classical|Musique classique|Orchestre, compositeurs et musique sur papier.
music-rock|Rock et metal|Guitares, section rythmique et histoire du son fort.
music-electronic|Musique électronique|Synthés, samples et son sorti des circuits.
music-jazz|Jazz et blues|Improvisation, swing et histoire du jazz et du blues.
music-instruments|Instruments de musique|Comment une corde, l'air et une membrane deviennent du son.
music-soundtracks|Musique de films et de jeux|Pourquoi l'écran a besoin de musique et comment elle change une scène.
media|Cinéma|Caméra, cadre et mondes inventés sur grand écran.
media-movies|Films|Films, genres et astuces du grand écran.
media-cartoons|Dessins animés|Dessins et modèles qu'on a fait bouger.
media-scifi|Science-fiction|Mondes du futur et idées cachées dans la SF.
media-heroes|Super-héros|Costumes, pouvoirs et histoires de héros à l'écran.
media-filmmaking|Faire un film|Caméra, montage et ceux qu'on ne voit jamais à l'image.
anime|Anime et manga|De la page de papier au mecha géant à l'écran.
anime-classics|Classiques de l'anime|Les œuvres qui ont fait découvrir l'anime à beaucoup.
anime-studios|Studios et réalisateurs|Qui se tient derrière l'image.
anime-manga|Manga|Pages, cases et astuces de la BD japonaise.
anime-mecha|Mecha et robots|Robots géants et petits humains au cœur de leurs histoires.
games|Jeux vidéo|Pixels, consoles, héros et règles qui nous gardent devant l'écran.
games-retro|Jeux rétro|Bornes d'arcade, premiers jeux et leurs limites.
games-consoles|Consoles|Matériel, manettes et générations de consoles.
games-heroes|Héros de jeux|Qui nous guide à travers les mondes de jeu ?
games-series|Genres et séries|Comment marchent les genres et ce qui a rendu les séries mémorables.
games-making|Créer des jeux|Du prototype au niveau qu'on veut rejouer.
hobby|Jeux et loisirs|Échecs, cartes, dés et appareil photo. Les mains savent quoi faire.
hobby-chess|Échecs|Pièces, ouvertures et retournements sur l'échiquier.
hobby-board|Jeux de société|Dés, plateau, règles et alliances inattendues.
hobby-puzzles|Casse-tête|Logique, formes et un problème qui résiste.
hobby-cards|Jeux de cartes|Paquets, couleurs et règles des jeux de cartes.
hobby-photo|Photographie|Lumière, objectif et l'image que tu as saisie.
japan|Japon|Fêtes, artisanat, cuisine et paysages du Japon.
japan-traditions|Traditions et fêtes|Jours de fête, rituels et coutumes familiales.
japan-food|Cuisine|Du bol de nouilles au repas élaboré.
japan-history|Histoire du Japon|Époques, souverains et tournants de l'histoire japonaise.
japan-crafts|Artisanat et arts|Papier, bois, tissu et mains de maîtres.
japan-places|Nature et villes|Montagnes, îles, rues et villes du Japon.
food|Cuisine|Ce qui pousse, ce qui mijote et pourquoi le monde sent si différemment.
food-cuisines|Cuisines du monde|Pourquoi des ingrédients proches sont cuisinés si différemment.
food-produce|Fruits et légumes|Fruits, racines et ce qu'on met dans la salade.
food-sweets|Douceurs et pâtisserie|Pâte, sucre et desserts de nombreux pays.
food-drinks|Thé, café et boissons|Feuilles, grains, eau et boissons qui ont une histoire.
food-spices|Épices|Graines, racines et arômes qui transforment un plat.
sport|Sport|Ballons, pistes, glace et duels. Prêt pour le premier round ?
sport-football|Football|Le terrain, les règles et l'histoire du jeu.
sport-olympics|Jeux olympiques|Disciplines, symboles et histoire des Jeux.
sport-motorsport|Sport automobile|Circuits, machines et travail d'équipe à grande vitesse.
sport-winter|Sports d'hiver|Glace, neige, skis et course contre la montre.
sport-combat|Sports de combat|Techniques, règles et traditions des arts martiaux.
sport-ballgames|Balles et raquettes|Différentes balles, différentes raquettes, différentes façons de gagner.
world|Cultures du monde|Fêtes, vêtements et habitudes des gens aux quatre coins du monde.
world-holidays|Fêtes du monde|Comment on célèbre les grands jours dans différents pays.
world-costumes|Costumes traditionnels|Vêtements, matières et motifs chargés d'histoire locale.
world-money|Argent et pièces|Pièces et billets comme petites pages d'histoire.
world-customs|Coutumes et traditions|Salutations, invités et règles du quotidien selon les lieux.
`;

TXT.es=`
animals|Mundo animal|De las branquias de los peces a las huellas de dinosaurio. ¿Quién se parece a quién?
animals-fish|Peces|Branquias, aletas y peces que sorprenderían hasta a un pescador.
animals-birds|Aves|Picos, plumas, vuelo y aves que no vuelan.
animals-insects|Insectos y arañas|Seis patas, ocho patas y un mundo entero bajo la lupa.
animals-reptiles|Reptiles y anfibios|Escamas, caparazones, ranas y vida entre tierra y agua.
animals-mammals|Mamíferos|Pelo, leche y muchas formas distintas de vivir en la Tierra.
animals-sea|Criaturas marinas|¿Quién se esconde en las profundidades, de las medusas a las ballenas?
animals-pets|Gatos y perros|Bigotes, patas, costumbres y razas.
animals-dino|Dinosaurios|Huesos, huellas e historias reales de reptiles antiguos.
nature|Naturaleza de la Tierra|Bosques, piedras, clima y lugares donde la Tierra muestra su carácter.
nature-plants|Plantas y flores|De la semilla a la flor: cómo crecen y sobreviven las plantas.
nature-trees|Árboles y bosques|Hojas, corteza, raíces y la vida de todo un bosque.
nature-mushrooms|Hongos|Sombreros, esporas y la red oculta de los hongos.
nature-weather|Tiempo y clima|Nubes, viento, tormentas y lo que pasa en la atmósfera.
nature-minerals|Rocas y minerales|Cristales, rocas y piedras escondidas bajo tierra.
nature-volcanoes|Volcanes y terremotos|Magma, fallas y fuerzas que mueven la corteza terrestre.
nature-oceans|Océanos y mares|Olas, corrientes, profundidades y cómo funcionan los mares.
nature-biomes|Desiertos, selvas y polos|Del hielo a la arena: quién sabe vivir en lo extremo.
space|Espacio|Planetas, estrellas y las máquinas que llegaron hasta ellos.
space-solar|Sistema solar|El Sol, los planetas, las lunas y sus órbitas.
space-moonmars|Luna y Marte|Dos mundos cercanos por los que ya han rodado vehículos.
space-stars|Estrellas y galaxias|Cómo nacen, brillan y se apagan las estrellas.
space-flight|Astronáutica|Cohetes, naves y el reto de salir más allá del cielo.
space-discovery|Telescopios y descubrimientos|Lentes, espejos y hallazgos que cambiaron nuestra mirada al cielo.
geo|Geografía|Países, islas, montañas y mapas. Probemos tu brújula interior.
geo-countries|Países y capitales|Fronteras y capitales sin el puntero del profe.
geo-cities|Ciudades del mundo|Ciudades que se reconocen por sus ríos, edificios e historias.
geo-relief|Montañas, ríos y lagos|Cumbres, cauces y lagos en el mapa de la Tierra.
geo-islands|Islas|De diminutas islas volcánicas a islas enormes.
geo-wonders|Maravillas del mundo|Lugares y obras por los que la gente viaja lejos.
geo-flags|Banderas|Colores y símbolos de las banderas: ¿qué significan?
science|Ciencia|Del átomo al ser humano: cómo funciona el mundo y cómo lo supimos.
science-physics|Física|Movimiento, luz, calor y las rarezas de la materia.
science-chemistry|Química|Elementos y reacciones sin olor a laboratorio escolar.
science-body|Cuerpo humano|Órganos, huesos y los pequeños sistemas de un gran cuerpo.
science-medicine|Medicina|Cómo se estudian las enfermedades y cómo se ayuda a las personas.
science-math|Matemáticas|Números, formas y problemas con una solución elegante.
science-scientists|Grandes científicos|Personas, experimentos y lo que descubrieron.
tech|Tecnología|Hardware, redes, robots y cosas que encendemos cada día.
tech-computers|Ordenadores|De qué está hecho un ordenador y cómo ejecuta órdenes.
tech-internet|Internet|Cómo encuentran los datos su camino entre dispositivos.
tech-ai|Redes neuronales|Cómo aprenden los modelos con ejemplos y dónde se equivocan.
tech-robots|Robots|Sensores, motores y máquinas que se mueven solas.
tech-security|Ciberseguridad|Contraseñas, cifrados y formas de proteger los datos.
tech-tools|Herramientas|Del destornillador al torno: por qué la forma resuelve la tarea.
tech-home|Electrodomésticos|Aparatos de casa y los trucos dentro de su carcasa.
transport|Transporte|Ruedas, raíles, alas y cascos. ¿Nos vamos?
transport-cars|Coches|Motores, ruedas y coches de distintas épocas.
transport-moto|Motos|Dos ruedas, un motor y la historia de las motos.
transport-trains|Trenes|Raíles, locomotoras y largos viajes.
transport-planes|Aviones|Alas, flujo de aire y vida en el cielo.
transport-ships|Barcos|Velas, hélices y naves a las que se confía el océano.
history|Historia|Personas, objetos y decisiones tras las que el mundo ya no fue igual.
history-ancient|Mundo antiguo|Ciudades, imperios y vida cotidiana de los pueblos antiguos.
history-medieval|Edad Media|Castillos, oficios y vida en la Edad Media.
history-warriors|Caballeros, samuráis y vikingos|Armaduras, armas y códigos de distintos guerreros.
history-pirates|Piratas y navegantes|Rutas marítimas, barcos y vida pirata.
history-discovery|Era de los descubrimientos|Rutas, mapas y encuentros de tierras lejanas.
history-modern|Edad Moderna|Ideas y cambios del siglo XVI al XIX.
history-c20|Siglo XX|Guerras, descubrimientos y vida diaria del siglo XX.
history-inventions|Inventos|Cuándo aparecieron las cosas sin las que no imaginamos la vida.
myth|Mitos y leyendas|Dioses, monstruos e historias para explicar lo imposible.
myth-greek|Grecia y Roma|Héroes, dioses y monstruos del Mediterráneo antiguo.
myth-norse|Mitología nórdica|Dioses del norte, gigantes y los mundos del árbol del mundo.
myth-slavic|Mitología eslava|Criaturas y relatos de las leyendas eslavas.
myth-egypt|Egipto|Dioses, símbolos y relatos del Antiguo Egipto.
myth-eastasia|China y Japón|Dragones, espíritus y relatos celestes de Asia oriental.
myth-creatures|Criaturas míticas|¿Quién se esconde en las leyendas de distintos pueblos?
art|Arte|Cuadros, estatuas, edificios y escenario. Mira con atención.
art-painting|Pintura|Colores, técnicas y temas sobre el lienzo.
art-sculpture|Escultura|Cómo la piedra y el metal se convierten en figuras.
art-architecture|Arquitectura|Arcos, cúpulas y edificios con carácter propio.
art-books|Literatura|Autores, tramas y libros que sobrevivieron a su época.
art-theatre|Teatro y ballet|Escenario, máscaras, danza y trabajo entre bastidores.
music|Música|Sonidos, instrumentos y las personas que los hicieron sonar juntos.
music-classical|Música clásica|Orquesta, compositores y música sobre papel.
music-rock|Rock y metal|Guitarras, sección rítmica e historia del sonido fuerte.
music-electronic|Música electrónica|Sintetizadores, samples y sonido salido de circuitos.
music-jazz|Jazz y blues|Improvisación, swing e historia del jazz y el blues.
music-instruments|Instrumentos musicales|Cómo una cuerda, el aire y una membrana se vuelven sonido.
music-soundtracks|Música de cine y juegos|Por qué la pantalla necesita música y cómo cambia una escena.
media|Cine|Cámara, encuadre y mundos inventados en la gran pantalla.
media-movies|Películas|Películas, géneros y trucos de la gran pantalla.
media-cartoons|Dibujos animados|Dibujos y modelos a los que se dio movimiento.
media-scifi|Ciencia ficción|Mundos del futuro y las ideas escondidas en la ciencia ficción.
media-heroes|Superhéroes|Trajes, poderes e historias de héroes en pantalla.
media-filmmaking|Cómo se hace cine|Cámara, montaje y las personas que nunca salen en el plano.
anime|Anime y manga|De la página de papel al mecha gigante en pantalla.
anime-classics|Clásicos del anime|Obras con las que muchos descubrieron el anime.
anime-studios|Estudios y directores|Quién está detrás de la imagen.
anime-manga|Manga|Páginas, viñetas y trucos del cómic japonés.
anime-mecha|Mecha y robots|Robots gigantes y las personas pequeñas dentro de sus historias.
games|Videojuegos|Píxeles, consolas, héroes y reglas que nos atrapan.
games-retro|Juegos retro|Máquinas recreativas, primeros juegos y sus límites.
games-consoles|Consolas|Hardware, mandos y generaciones de consolas.
games-heroes|Héroes de videojuegos|¿Quién nos guía por los mundos de juego?
games-series|Géneros y sagas|Cómo funcionan los géneros y qué hizo memorables a las sagas.
games-making|Cómo se hacen juegos|Del prototipo a un nivel que quieres volver a jugar.
hobby|Juegos y aficiones|Ajedrez, cartas, dados y cámara. Las manos saben qué hacer.
hobby-chess|Ajedrez|Piezas, aperturas y giros en el tablero.
hobby-board|Juegos de mesa|Dados, tablero, reglas y alianzas inesperadas.
hobby-puzzles|Rompecabezas|Lógica, formas y un problema que no se rinde.
hobby-cards|Juegos de cartas|Barajas, palos y reglas de los juegos de cartas.
hobby-photo|Fotografía|Luz, objetivo y la imagen que atrapaste.
japan|Japón|Fiestas, artesanía, comida y paisajes de Japón.
japan-traditions|Tradiciones y fiestas|Días festivos, rituales y costumbres familiares.
japan-food|Cocina|Del cuenco de fideos a la comida elaborada.
japan-history|Historia de Japón|Épocas, gobernantes y giros de la historia japonesa.
japan-crafts|Artesanía y artes|Papel, madera, tela y manos de maestros.
japan-places|Naturaleza y ciudades|Montañas, islas, calles y ciudades de Japón.
food|Comida|Lo que crece, lo que se cocina y por qué el mundo huele distinto.
food-cuisines|Cocinas del mundo|Por qué ingredientes parecidos se cocinan tan distinto.
food-produce|Frutas y verduras|Frutos, raíces y lo que va en la ensalada.
food-sweets|Dulces y repostería|Masa, azúcar y postres de muchos países.
food-drinks|Té, café y bebidas|Hojas, granos, agua y bebidas con historia.
food-spices|Especias|Semillas, raíces y aromas que cambian un plato.
sport|Deporte|Balones, pistas, hielo y duelos. ¿Listo para el primer asalto?
sport-football|Fútbol|El campo, las reglas y la historia del juego.
sport-olympics|Juegos Olímpicos|Disciplinas, símbolos e historia de los Juegos.
sport-motorsport|Automovilismo|Circuitos, máquinas y trabajo en equipo a toda velocidad.
sport-winter|Deportes de invierno|Hielo, nieve, esquís y la carrera contra el reloj.
sport-combat|Artes marciales|Técnicas, reglas y tradiciones de los deportes de combate.
sport-ballgames|Balones y raquetas|Distintos balones, distintas raquetas, distintas formas de ganar.
world|Culturas del mundo|Fiestas, ropa y costumbres de gente de todo el mundo.
world-holidays|Fiestas del mundo|Cómo se celebran los días importantes en distintos países.
world-costumes|Trajes tradicionales|Ropa, materiales y dibujos con historia local.
world-money|Dinero y monedas|Monedas y billetes como pequeñas páginas de historia.
world-customs|Costumbres y tradiciones|Saludos, invitados y normas cotidianas de distintos lugares.
`;

TXT.it=`
animals|Mondo animale|Dalle branchie dei pesci alle impronte dei dinosauri. Chi somiglia a chi?
animals-fish|Pesci|Branchie, pinne e pesci che stupirebbero anche un pescatore.
animals-birds|Uccelli|Becchi, piume, volo e uccelli che non volano.
animals-insects|Insetti e ragni|Sei zampe, otto zampe e un mondo intero sotto la lente.
animals-reptiles|Rettili e anfibi|Squame, gusci, rane e vita tra terra e acqua.
animals-mammals|Mammiferi|Pelo, latte e tanti modi diversi di vivere sulla Terra.
animals-sea|Creature marine|Chi si nasconde negli abissi, dalle meduse alle balene?
animals-pets|Gatti e cani|Baffi, zampe, abitudini e razze.
animals-dino|Dinosauri|Ossa, impronte e storie vere di antichi rettili.
nature|Natura della Terra|Foreste, pietre, meteo e luoghi dove la Terra mostra il suo carattere.
nature-plants|Piante e fiori|Dal seme al fiore: come le piante crescono e sopravvivono.
nature-trees|Alberi e foreste|Foglie, corteccia, radici e la vita di un intero bosco.
nature-mushrooms|Funghi|Cappelli, spore e la rete nascosta dei funghi.
nature-weather|Meteo e clima|Nuvole, vento, temporali e cosa succede nell'atmosfera.
nature-minerals|Rocce e minerali|Cristalli, rocce e pietre nascoste sottoterra.
nature-volcanoes|Vulcani e terremoti|Magma, faglie e forze che muovono la crosta terrestre.
nature-oceans|Oceani e mari|Onde, correnti, profondità e come funzionano i mari.
nature-biomes|Deserti, giungle e poli|Dal ghiaccio alla sabbia: chi sa vivere agli estremi.
space|Spazio|Pianeti, stelle e le macchine che li hanno raggiunti.
space-solar|Sistema solare|Il Sole, i pianeti, le lune e le loro orbite.
space-moonmars|Luna e Marte|Due mondi vicini già percorsi dai rover.
space-stars|Stelle e galassie|Come nascono, brillano e si spengono le stelle.
space-flight|Astronautica|Razzi, navicelle e l'impresa di andare oltre il cielo.
space-discovery|Telescopi e scoperte|Lenti, specchi e scoperte che hanno cambiato il nostro sguardo sul cielo.
geo|Geografia|Paesi, isole, montagne e mappe. Mettiamo alla prova la tua bussola interiore.
geo-countries|Paesi e capitali|Confini e capitali senza la bacchetta del prof.
geo-cities|Città del mondo|Città che si riconoscono da fiumi, edifici e storie.
geo-relief|Monti, fiumi e laghi|Vette, corsi d'acqua e laghi sulla mappa della Terra.
geo-islands|Isole|Da minuscole isole vulcaniche a isole enormi.
geo-wonders|Meraviglie del mondo|Luoghi e opere per cui si viaggia lontano.
geo-flags|Bandiere|Colori e simboli delle bandiere: che cosa significano?
science|Scienza|Dall'atomo all'uomo: come funziona il mondo e come l'abbiamo scoperto.
science-physics|Fisica|Moto, luce, calore e le strane abitudini della materia.
science-chemistry|Chimica|Elementi e reazioni senza l'odore del laboratorio di scuola.
science-body|Corpo umano|Organi, ossa e i piccoli sistemi di un grande corpo.
science-medicine|Medicina|Come si studiano le malattie e come si aiutano le persone.
science-math|Matematica|Numeri, forme e problemi con una soluzione elegante.
science-scientists|Grandi scienziati|Persone, esperimenti e ciò che hanno scoperto.
tech|Tecnologia|Hardware, reti, robot e cose che accendiamo ogni giorno.
tech-computers|Computer|Di cosa è fatto un computer e come esegue i comandi.
tech-internet|Internet|Come i dati trovano la strada tra i dispositivi.
tech-ai|Reti neurali|Come i modelli imparano dagli esempi e dove sbagliano.
tech-robots|Robot|Sensori, motori e macchine che si muovono da sole.
tech-security|Sicurezza informatica|Password, cifrari e modi per proteggere i dati.
tech-tools|Attrezzi|Dal cacciavite al tornio: perché la forma risolve il compito.
tech-home|Elettrodomestici|Gli apparecchi di casa e i trucchi dentro i loro gusci.
transport|Trasporti|Ruote, binari, ali e scafi. Si parte?
transport-cars|Auto|Motori, ruote e auto di epoche diverse.
transport-moto|Moto|Due ruote, un motore e la storia della moto.
transport-trains|Treni|Binari, locomotive e lunghi viaggi.
transport-planes|Aerei|Ali, flusso d'aria e vita nel cielo.
transport-ships|Navi|Vele, eliche e navi a cui si affida l'oceano.
history|Storia|Persone, oggetti e decisioni dopo cui il mondo non è più stato lo stesso.
history-ancient|Mondo antico|Città, imperi e vita quotidiana dei popoli antichi.
history-medieval|Medioevo|Castelli, mestieri e vita nel Medioevo.
history-warriors|Cavalieri, samurai e vichinghi|Armature, armi e codici di guerrieri diversi.
history-pirates|Pirati e navigatori|Rotte marine, navi e vita dei pirati.
history-discovery|Età delle scoperte|Rotte, mappe e incontri con terre lontane.
history-modern|Età moderna|Idee e cambiamenti dal XVI al XIX secolo.
history-c20|XX secolo|Guerre, scoperte e vita quotidiana del Novecento.
history-inventions|Invenzioni|Quando sono comparse le cose senza cui la vita è difficile da immaginare.
myth|Miti e leggende|Dei, mostri e storie per spiegare l'impossibile.
myth-greek|Grecia e Roma|Eroi, dei e mostri del Mediterraneo antico.
myth-norse|Mitologia norrena|Dei del nord, giganti e i mondi dell'albero cosmico.
myth-slavic|Mitologia slava|Creature e racconti delle leggende slave.
myth-egypt|Egitto|Dei, simboli e racconti dell'Antico Egitto.
myth-eastasia|Cina e Giappone|Draghi, spiriti e storie celesti dell'Asia orientale.
myth-creatures|Creature mitiche|Chi si nasconde nelle leggende dei vari popoli?
art|Arte|Quadri, statue, edifici e palcoscenico. Guarda meglio.
art-painting|Pittura|Colori, tecniche e soggetti sulla tela.
art-sculpture|Scultura|Come pietra e metallo diventano figure.
art-architecture|Architettura|Archi, cupole ed edifici con carattere.
art-books|Letteratura|Autori, trame e libri sopravvissuti alla loro epoca.
art-theatre|Teatro e balletto|Palco, maschere, danza e lavoro dietro le quinte.
music|Musica|Suoni, strumenti e le persone che li hanno fatti suonare insieme.
music-classical|Musica classica|Orchestra, compositori e musica sulla carta.
music-rock|Rock e metal|Chitarre, sezione ritmica e storia del suono forte.
music-electronic|Musica elettronica|Sintetizzatori, campioni e suono dai circuiti.
music-jazz|Jazz e blues|Improvvisazione, swing e storia del jazz e del blues.
music-instruments|Strumenti musicali|Come una corda, l'aria e una membrana diventano suono.
music-soundtracks|Musica da film e giochi|Perché lo schermo ha bisogno di musica e come cambia una scena.
media|Cinema|Macchina da presa, inquadratura e mondi inventati sul grande schermo.
media-movies|Film|Film, generi e trucchi del grande schermo.
media-cartoons|Cartoni animati|Disegni e modelli a cui è stato dato il movimento.
media-scifi|Fantascienza|Mondi del futuro e idee nascoste nella fantascienza.
media-heroes|Supereroi|Costumi, poteri e storie di eroi sullo schermo.
media-filmmaking|Come si fa un film|Ripresa, montaggio e le persone che non si vedono mai nell'inquadratura.
anime|Anime e manga|Dalla pagina di carta al mecha gigante sullo schermo.
anime-classics|Classici dell'anime|Opere con cui molti hanno scoperto l'anime.
anime-studios|Studi e registi|Chi sta dietro all'inquadratura.
anime-manga|Manga|Pagine, vignette e trucchi del fumetto giapponese.
anime-mecha|Mecha e robot|Robot giganti e piccole persone dentro le loro storie.
games|Videogiochi|Pixel, console, eroi e regole che ci tengono davanti allo schermo.
games-retro|Giochi retrò|Cabinati arcade, primi giochi e i loro limiti.
games-consoles|Console|Hardware, controller e generazioni di console.
games-heroes|Eroi dei videogiochi|Chi ci guida nei mondi di gioco?
games-series|Generi e saghe|Come funzionano i generi e cosa ha reso memorabili le saghe.
games-making|Come si fanno i giochi|Dal prototipo a un livello che vuoi rigiocare.
hobby|Giochi e hobby|Scacchi, carte, dadi e macchina fotografica. Le mani sanno cosa fare.
hobby-chess|Scacchi|Pezzi, aperture e colpi di scena sulla scacchiera.
hobby-board|Giochi da tavolo|Dadi, tabellone, regole e alleanze inattese.
hobby-puzzles|Rompicapo|Logica, forme e un problema che non si arrende.
hobby-cards|Giochi di carte|Mazzi, semi e regole dei giochi di carte.
hobby-photo|Fotografia|Luce, obiettivo e lo scatto che hai catturato.
japan|Giappone|Feste, artigianato, cucina e paesaggi del Giappone.
japan-traditions|Tradizioni e feste|Giorni di festa, rituali e usanze di famiglia.
japan-food|Cucina|Dalla ciotola di noodle al pranzo elaborato.
japan-history|Storia del Giappone|Epoche, sovrani e svolte della storia giapponese.
japan-crafts|Artigianato e arti|Carta, legno, tessuto e mani di maestri.
japan-places|Natura e città|Montagne, isole, strade e città del Giappone.
food|Cibo|Cosa cresce, cosa cuoce e perché il mondo ha profumi così diversi.
food-cuisines|Cucine del mondo|Perché ingredienti simili si cucinano in modo così diverso.
food-produce|Frutta e verdura|Frutti, radici e ciò che mettiamo nell'insalata.
food-sweets|Dolci e pasticceria|Impasto, zucchero e dessert di molti paesi.
food-drinks|Tè, caffè e bevande|Foglie, chicchi, acqua e bevande con una storia.
food-spices|Spezie|Semi, radici e aromi che cambiano un piatto.
sport|Sport|Palloni, piste, ghiaccio e duelli. Pronto per il primo round?
sport-football|Calcio|Il campo, le regole e la storia del gioco.
sport-olympics|Giochi olimpici|Discipline, simboli e storia dei Giochi.
sport-motorsport|Motorsport|Circuiti, macchine e lavoro di squadra ad alta velocità.
sport-winter|Sport invernali|Ghiaccio, neve, sci e la corsa contro il tempo.
sport-combat|Arti marziali|Tecniche, regole e tradizioni degli sport da combattimento.
sport-ballgames|Palle e racchette|Palle diverse, racchette diverse, modi diversi di vincere.
world|Culture del mondo|Feste, abiti e abitudini delle persone in tutto il mondo.
world-holidays|Feste del mondo|Come si celebrano i giorni importanti nei vari paesi.
world-costumes|Costumi tradizionali|Abiti, materiali e motivi con una storia locale.
world-money|Denaro e monete|Monete e banconote come piccole pagine di storia.
world-customs|Usanze e tradizioni|Saluti, ospiti e regole quotidiane in luoghi diversi.
`;

TXT.pl=`
animals|Świat zwierząt|Od skrzeli ryb po ślady dinozaurów. Kto tu jest do kogo podobny?
animals-fish|Ryby|Skrzela, płetwy i ryby, które zaskoczą nawet wędkarza.
animals-birds|Ptaki|Dzioby, pióra, lot i ptaki, które nie latają.
animals-insects|Owady i pająki|Sześć nóg, osiem nóg i cały świat pod lupą.
animals-reptiles|Gady i płazy|Łuski, skorupy, żaby i życie między lądem a wodą.
animals-mammals|Ssaki|Futro, mleko i bardzo różne sposoby życia na Ziemi.
animals-sea|Mieszkańcy mórz|Kto kryje się w głębinach, od meduz po wieloryby?
animals-pets|Koty i psy|Wąsy, łapy, zwyczaje i rasy.
animals-dino|Dinozaury|Kości, ślady i prawdziwe historie dawnych gadów.
nature|Przyroda Ziemi|Lasy, kamienie, pogoda i miejsca, gdzie Ziemia pokazuje charakter.
nature-plants|Rośliny i kwiaty|Od nasiona do kwiatu: jak rośliny rosną i przetrwają.
nature-trees|Drzewa i lasy|Liście, kora, korzenie i życie całego lasu.
nature-mushrooms|Grzyby|Kapelusze, zarodniki i ukryta sieć grzybów.
nature-weather|Pogoda i klimat|Chmury, wiatr, burze i to, co dzieje się w atmosferze.
nature-minerals|Skały i minerały|Kryształy, skały i kamienie ukryte pod ziemią.
nature-volcanoes|Wulkany i trzęsienia ziemi|Magma, uskoki i siły, które przesuwają skorupę Ziemi.
nature-oceans|Oceany i morza|Fale, prądy, głębiny i to, jak działają morza.
nature-biomes|Pustynie, dżungle i bieguny|Od lodu po piasek: kto umie żyć w skrajnych warunkach.
space|Kosmos|Planety, gwiazdy i maszyny, które do nich dotarły.
space-solar|Układ Słoneczny|Słońce, planety, księżyce i ich orbity.
space-moonmars|Księżyc i Mars|Dwa bliskie światy, po których jeździły już łaziki.
space-stars|Gwiazdy i galaktyki|Jak gwiazdy się rodzą, świecą i gasną.
space-flight|Astronautyka|Rakiety, statki i zadanie wyjścia poza niebo.
space-discovery|Teleskopy i odkrycia|Soczewki, lustra i odkrycia, które zmieniły nasz widok na niebo.
geo|Geografia|Kraje, wyspy, góry i mapy. Sprawdźmy twój wewnętrzny kompas.
geo-countries|Kraje i stolice|Granice i stolice bez szkolnego wskaźnika.
geo-cities|Miasta świata|Miasta, które poznaje się po rzekach, budynkach i historiach.
geo-relief|Góry, rzeki i jeziora|Szczyty, koryta rzek i jeziora na mapie Ziemi.
geo-islands|Wyspy|Od maleńkich wysp wulkanicznych po ogromne wyspy.
geo-wonders|Cuda świata|Budowle i miejsca, dla których ludzie jadą daleko.
geo-flags|Flagi|Kolory i symbole na flagach: co oznaczają?
science|Nauka|Od atomu do człowieka: jak działa świat i jak się tego dowiedzieliśmy.
science-physics|Fizyka|Ruch, światło, ciepło i dziwne zwyczaje materii.
science-chemistry|Chemia|Pierwiastki i reakcje bez zapachu szkolnej pracowni.
science-body|Ciało człowieka|Narządy, kości i małe układy dużego ciała.
science-medicine|Medycyna|Jak bada się choroby i jak pomaga się ludziom.
science-math|Matematyka|Liczby, kształty i zadania z pięknym rozwiązaniem.
science-scientists|Wielcy naukowcy|Ludzie, eksperymenty i ich odkrycia.
tech|Technologia|Sprzęt, sieci, roboty i rzeczy, które włączamy codziennie.
tech-computers|Komputery|Z czego składa się komputer i jak wykonuje polecenia.
tech-internet|Internet|Jak dane znajdują drogę między urządzeniami.
tech-ai|Sieci neuronowe|Jak modele uczą się na przykładach i gdzie się mylą.
tech-robots|Roboty|Czujniki, napędy i maszyny, które poruszają się same.
tech-security|Cyberbezpieczeństwo|Hasła, szyfry i sposoby ochrony danych.
tech-tools|Narzędzia|Od śrubokręta po tokarkę: dlaczego kształt rozwiązuje zadanie.
tech-home|AGD|Urządzenia domowe i sztuczki ukryte w ich obudowach.
transport|Transport|Koła, szyny, skrzydła i kadłuby. Jedziemy?
transport-cars|Samochody|Silniki, koła i samochody z różnych epok.
transport-moto|Motocykle|Dwa koła, silnik i historia motocykli.
transport-trains|Pociągi|Szyny, lokomotywy i długie trasy.
transport-planes|Samoloty|Skrzydła, przepływ powietrza i życie w przestworzach.
transport-ships|Statki|Żagle, śruby i statki, którym powierza się ocean.
history|Historia|Ludzie, rzeczy i decyzje, po których świat nie był już taki sam.
history-ancient|Starożytność|Miasta, imperia i codzienność dawnych ludzi.
history-medieval|Średniowiecze|Zamki, rzemiosło i życie w średniowieczu.
history-warriors|Rycerze, samuraje i wikingowie|Zbroje, broń i kodeksy różnych wojowników.
history-pirates|Piraci i żeglarze|Szlaki morskie, statki i życie piratów.
history-discovery|Wielkie odkrycia|Trasy, mapy i spotkania dalekich lądów.
history-modern|Czasy nowożytne|Idee i przemiany od XVI do XIX wieku.
history-c20|XX wiek|Wojny, odkrycia i codzienność XX wieku.
history-inventions|Wynalazki|Kiedy pojawiły się rzeczy, bez których trudno wyobrazić sobie życie.
myth|Mity i legendy|Bogowie, potwory i opowieści, którymi tłumaczono niemożliwe.
myth-greek|Grecja i Rzym|Bohaterowie, bogowie i potwory starożytnego Śródziemnomorza.
myth-norse|Mitologia nordycka|Bogowie Północy, olbrzymy i światy na drzewie świata.
myth-slavic|Mitologia słowiańska|Istoty i opowieści ze słowiańskich podań.
myth-egypt|Egipt|Bogowie, symbole i opowieści starożytnego Egiptu.
myth-eastasia|Chiny i Japonia|Smoki, duchy i niebiańskie opowieści Azji Wschodniej.
myth-creatures|Stworzenia mityczne|Kto kryje się w legendach różnych ludów?
art|Sztuka|Obrazy, posągi, budynki i scena. Przyjrzyj się uważniej.
art-painting|Malarstwo|Farby, techniki i tematy na płótnie.
art-sculpture|Rzeźba|Jak kamień i metal stają się postaciami.
art-architecture|Architektura|Łuki, kopuły i budynki z charakterem.
art-books|Literatura|Autorzy, fabuły i książki, które przetrwały swoje epoki.
art-theatre|Teatr i balet|Scena, maski, taniec i praca za kulisami.
music|Muzyka|Dźwięki, instrumenty i ludzie, którzy sprawili, że brzmią razem.
music-classical|Muzyka klasyczna|Orkiestra, kompozytorzy i muzyka na papierze.
music-rock|Rock i metal|Gitary, sekcja rytmiczna i historia głośnego brzmienia.
music-electronic|Muzyka elektroniczna|Syntezatory, sample i dźwięk z obwodów.
music-jazz|Jazz i blues|Improwizacja, swing i historia jazzu i bluesa.
music-instruments|Instrumenty muzyczne|Jak struna, powietrze i membrana zamieniają się w dźwięk.
music-soundtracks|Muzyka filmowa i z gier|Po co ekranowi muzyka i jak zmienia scenę.
media|Kino|Kamera, kadr i wymyślone światy na wielkim ekranie.
media-movies|Filmy|Filmy, gatunki i sztuczki wielkiego ekranu.
media-cartoons|Filmy animowane|Rysunki i modele, którym dano ruch.
media-scifi|Fantastyka naukowa|Światy przyszłości i idee ukryte w science fiction.
media-heroes|Superbohaterowie|Kostiumy, moce i historie bohaterów na ekranie.
media-filmmaking|Jak powstaje film|Kamera, montaż i ludzie, których nigdy nie widać w kadrze.
anime|Anime i manga|Od papierowej strony do ogromnego mecha na ekranie.
anime-classics|Klasyka anime|Dzieła, od których wielu zaczęło przygodę z anime.
anime-studios|Studia i reżyserzy|Kto stoi za kadrem.
anime-manga|Manga|Strony, kadry i sztuczki japońskiego komiksu.
anime-mecha|Mecha i roboty|Wielkie roboty i mali ludzie w ich historiach.
games|Gry wideo|Piksele, konsole, bohaterowie i zasady, które trzymają nas przy ekranie.
games-retro|Gry retro|Automaty, pierwsze gry i ich ograniczenia.
games-consoles|Konsole|Sprzęt, kontrolery i generacje konsol.
games-heroes|Bohaterowie gier|Kto prowadzi nas przez światy gier?
games-series|Gatunki i serie|Jak działają gatunki i czym zapadły w pamięć serie gier.
games-making|Jak powstają gry|Od prototypu do poziomu, do którego chce się wracać.
hobby|Gry i hobby|Szachy, karty, kości i aparat. Ręce wiedzą, co robić.
hobby-chess|Szachy|Figury, debiuty i zwroty akcji na szachownicy.
hobby-board|Gry planszowe|Kości, plansza, zasady i nieoczekiwane sojusze.
hobby-puzzles|Łamigłówki|Logika, kształty i zadanie, które się nie poddaje.
hobby-cards|Gry karciane|Talie, kolory i zasady gier karcianych.
hobby-photo|Fotografia|Światło, obiektyw i kadr, który złapałeś.
japan|Japonia|Święta, rzemiosło, jedzenie i krajobrazy Japonii.
japan-traditions|Tradycje i święta|Dni świąteczne, rytuały i zwyczaje rodzinne.
japan-food|Kuchnia|Od miski makaronu po wyszukany obiad.
japan-history|Historia Japonii|Epoki, władcy i zwroty japońskiej historii.
japan-crafts|Rzemiosło i sztuka|Papier, drewno, tkanina i ręce mistrzów.
japan-places|Przyroda i miasta|Góry, wyspy, ulice i miasta Japonii.
food|Jedzenie|Co rośnie, co się gotuje i dlaczego świat pachnie tak różnie.
food-cuisines|Kuchnie świata|Dlaczego podobne składniki gotuje się tak różnie.
food-produce|Owoce i warzywa|Owoce, korzenie i to, co ląduje w sałatce.
food-sweets|Słodycze i wypieki|Ciasto, cukier i desery z wielu krajów.
food-drinks|Herbata, kawa i napoje|Liście, ziarna, woda i napoje z historią.
food-spices|Przyprawy|Nasiona, korzenie i aromaty, które zmieniają danie.
sport|Sport|Piłki, tory, lód i pojedynki. Gotowy na pierwszą rundę?
sport-football|Piłka nożna|Boisko, zasady i historia gry.
sport-olympics|Igrzyska olimpijskie|Dyscypliny, symbole i historia Igrzysk.
sport-motorsport|Sporty motorowe|Tory, maszyny i praca zespołu przy dużej prędkości.
sport-winter|Sporty zimowe|Lód, śnieg, narty i walka z czasem.
sport-combat|Sporty walki|Techniki, zasady i tradycje sportów walki.
sport-ballgames|Piłki i rakiety|Różne piłki, różne rakiety, różne sposoby na zwycięstwo.
world|Kultury świata|Święta, stroje i zwyczaje ludzi z różnych zakątków świata.
world-holidays|Święta świata|Jak ludzie świętują ważne dni w różnych krajach.
world-costumes|Stroje ludowe|Ubrania, materiały i wzory z lokalną historią.
world-money|Pieniądze i monety|Monety i banknoty jako małe strony historii.
world-customs|Zwyczaje i tradycje|Powitania, goście i codzienne zasady w różnych miejscach.
`;

var DICT={};
function parse(code){
  if(DICT[code])return DICT[code];
  var d={};
  (TXT[code]||'').split('\n').forEach(function(line){
    if(!line)return;
    var p=line.split('|');if(p.length<3)return;
    d[p[0]]={name:p[1],desc:p[2]};
  });
  return (DICT[code]=d);
}
function entry(key){
  var d=parse(I18n.lang);
  return d[key]||parse('en')[key]||parse('ru')[key]||{name:key,desc:''};
}

var byId={};
GENRES.forEach(function(g,i){g.index=i;byId[g.id]=g;});

window.QCat={
  genres:GENRES,
  genre:function(id){return byId[id]||null;},
  name:function(key){return entry(key).name;},
  desc:function(key){return entry(key).desc;},
  ready:function(key){return READY[key]||0;},
  readyIn:function(gid){var g=byId[gid],n=0;if(g)g.subs.forEach(function(s){n+=READY[gid+'-'+s]||0;});return n;},
  levels:10,
  lives:function(level){return level<=5?2:1;},
  frame:function(level){return Math.ceil(level/2);},       // рамка карточки 1..5
  totalSubs:function(){return GENRES.reduce(function(n,g){return n+g.subs.length;},0);}
};
})();
