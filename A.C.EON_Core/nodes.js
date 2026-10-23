/* Карта сети A.C.EON: сектора и страницы ядра.

   Новая страница = одна запись в CORE_NODES:
     {id:'racer', sector:'games', name:'WASTELAND', url:'../games/racer/', status:'beta', added:'2026-11-02',
      tag:{ru:'гонка', en:'racing'}, desc:{ru:'Гонка на выживание.', en:'Survival racing.'}}

   id       уникальное имя (латиница), по нему считается память посетителя
   sector   games | music | studio | tools | learn | people
   name     название на узле: строка (одинаково на всех языках) или {ru:'...', en:'...'}
   url      адрес от папки A.C.EON_Core; внешний сайт с external:true откроется в новой вкладке
   status   live (работает) | beta | dev (в разработке, но открывается) | soon (заглушка, без url)
   added    дата появления: 21 день после неё на узле горит NEW, пока посетитель туда не зашёл
   tag      2-3 слова под узлом
   desc     одна фраза в подсказке
   Языков, которых нет в tag/desc, берётся en, потом ru.
   Порядок записей = порядок узлов по кругу и в списке слева. */

window.CORE_SECTORS = [
  {id:'games',  color:'#4DAFFF', icon:'games'},
  {id:'music',  color:'#B98CFF', icon:'music'},
  {id:'studio', color:'#FFD060', icon:'studio'},
  {id:'tools',  color:'#3DFFB4', icon:'tools'},
  {id:'learn',  color:'#FF9F43', icon:'learn'},
  {id:'people', color:'#9EC3D6', icon:'people'}
];

window.CORE_NODES = [
  /* игры */
  {id:'arcade', sector:'games', name:'ARCADE', url:'../games/', status:'live', w:2.6,
   tag:{ru:'классика и головоломки', en:'classics and puzzles', de:'Klassiker und Rätsel', fr:'classiques et casse-têtes', es:'clásicos y puzles', it:'classici e rompicapi', pl:'klasyka i łamigłówki'},
   desc:{ru:'Шахматы, змейка, пасьянс, морской бой и другие игры прямо в браузере.', en:'Chess, snake, solitaire, battleship and more, right in the browser.', de:'Schach, Snake, Solitär, Schiffe versenken und mehr, direkt im Browser.', fr:'Échecs, snake, solitaire, bataille navale et plus, dans le navigateur.', es:'Ajedrez, snake, solitario, hundir la flota y más, en el navegador.', it:'Scacchi, snake, solitario, battaglia navale e altro, nel browser.', pl:'Szachy, wąż, pasjans, statki i więcej, prosto w przeglądarce.'}},
  {id:'aceonium', sector:'games', name:'ACEONIUM', url:'../games/aceonium/', status:'beta', w:2.3,
   tag:{ru:'3D-кликер', en:'3D clicker', de:'3D-Clicker', fr:'clicker 3D', es:'clicker 3D', it:'clicker 3D', pl:'clicker 3D'},
   desc:{ru:'Маг, таверна и бесконечный путь. Ролевой кликер в 3D.', en:'A mage, a tavern and an endless road. A 3D role-playing clicker.', de:'Ein Magier, eine Taverne und ein endloser Weg. Rollenspiel-Clicker in 3D.', fr:'Un mage, une taverne et une route sans fin. Clicker de rôle en 3D.', es:'Un mago, una taberna y un camino sin fin. Clicker de rol en 3D.', it:'Un mago, una taverna e una strada infinita. Clicker di ruolo in 3D.', pl:'Mag, karczma i niekończąca się droga. Clicker RPG w 3D.'}},
  {id:'bresh', sector:'games', name:{ru:'БРЕШЬ', en:'BREACH', de:'BREACH', fr:'BRÈCHE', es:'BRECHA', it:'BRECCIA', pl:'WYŁOM'}, url:'../games/cyber/', status:'dev', w:2.0,
   tag:{ru:'меч / щит', en:'sword / shield', de:'Schwert / Schild', fr:'épée / bouclier', es:'espada / escudo', it:'spada / scudo', pl:'miecz / tarcza'},
   desc:{ru:'Песочница кибербезопасности: атакуй и защищай.', en:'A cybersecurity sandbox: attack and defend.', de:'Eine Cybersecurity-Sandbox: angreifen und verteidigen.', fr:'Un bac à sable de cybersécurité : attaquer et défendre.', es:'Un sandbox de ciberseguridad: ataca y defiende.', it:'Una sandbox di cybersicurezza: attacca e difendi.', pl:'Piaskownica cyberbezpieczeństwa: atakuj i broń.'}},

  /* музыка */
  {id:'music_archive', sector:'music', name:'MUSIC ARCHIVE', url:'../Music%20archive/', status:'live', w:2.8,
   tag:{ru:'плеер', en:'player', de:'Player', fr:'lecteur', es:'reproductor', it:'player', pl:'odtwarzacz'},
   desc:{ru:'Все треки A.C.EON в одном плеере.', en:'Every A.C.EON track in one player.', de:'Alle A.C.EON-Tracks in einem Player.', fr:'Tous les morceaux A.C.EON dans un seul lecteur.', es:'Todas las pistas de A.C.EON en un reproductor.', it:'Tutte le tracce A.C.EON in un unico player.', pl:'Wszystkie utwory A.C.EON w jednym odtwarzaczu.'}},
  {id:'liguria', sector:'music', name:{ru:'ЛИГУРИЯ', en:'LIGURIA', de:'LIGURIEN', fr:'LIGURIE', es:'LIGURIA', it:'LIGURIA', pl:'LIGURIA'}, url:'../fragment02/', status:'live', w:2.2,
   tag:{ru:'история песни', en:'song story', de:'Song-Geschichte', fr:'histoire d\'un titre', es:'historia de canción', it:'storia di un brano', pl:'historia piosenki'},
   desc:{ru:'Как родилась песня: интерактивная скороговорка.', en:'How the song was born: an interactive tongue twister.', de:'Wie der Song entstand: ein interaktiver Zungenbrecher.', fr:'Comment le titre est né : un virelangue interactif.', es:'Cómo nació la canción: un trabalenguas interactivo.', it:'Come è nato il brano: uno scioglilingua interattivo.', pl:'Jak powstała piosenka: interaktywny łamaniec językowy.'}},
  {id:'idolls', sector:'music', name:'IDOLLS', url:'../idolls/', status:'live', w:2.2,
   tag:{ru:'история песни', en:'song story', de:'Song-Geschichte', fr:'histoire d\'un titre', es:'historia de canción', it:'storia di un brano', pl:'historia piosenki'},
   desc:{ru:'Dark opera: история создания, интерактив.', en:'Dark opera: the making of, interactive.', de:'Dark Opera: die Entstehung, interaktiv.', fr:'Dark opera : la création, en interactif.', es:'Dark opera: cómo se hizo, interactivo.', it:'Dark opera: come è nata, interattivo.', pl:'Dark opera: historia powstania, interaktywnie.'}},
  {id:'music_soon', sector:'music', status:'soon', w:1.6,
   desc:{ru:'Новая история песни готовится.', en:'A new song story is in the works.', de:'Eine neue Song-Geschichte entsteht.', fr:'Une nouvelle histoire de titre se prépare.', es:'Se prepara una nueva historia de canción.', it:'Una nuova storia di un brano è in arrivo.', pl:'Nowa historia piosenki w przygotowaniu.'}},

  /* студия */
  {id:'info', sector:'studio', name:'INFO', url:'../info/', status:'live', w:2.4,
   tag:{ru:'о проекте', en:'about', de:'über uns', fr:'à propos', es:'sobre el proyecto', it:'il progetto', pl:'o projekcie'},
   desc:{ru:'Что такое A.C.EON и как он появился.', en:'What A.C.EON is and how it began.', de:'Was A.C.EON ist und wie es begann.', fr:'Ce qu\'est A.C.EON et comment tout a commencé.', es:'Qué es A.C.EON y cómo empezó.', it:'Cos\'è A.C.EON e come è nato.', pl:'Czym jest A.C.EON i jak powstał.'}},
  {id:'youtube', sector:'studio', name:'A.C.EON YT', url:'https://www.youtube.com/@A.C.EONStudio', external:true, status:'live', w:2.3,
   tag:{ru:'видео', en:'video', de:'Video', fr:'vidéo', es:'vídeo', it:'video', pl:'wideo'},
   desc:{ru:'Официальный канал студии на YouTube.', en:'The studio\'s official YouTube channel.', de:'Der offizielle YouTube-Kanal des Studios.', fr:'La chaîne YouTube officielle du studio.', es:'El canal oficial del estudio en YouTube.', it:'Il canale YouTube ufficiale dello studio.', pl:'Oficjalny kanał studia na YouTube.'}},
  {id:'coin', sector:'studio', name:'A.C.EON COIN', url:'../aceon-coin/coin-info.html', status:'dev', w:2.2,
   tag:{ru:'монета', en:'coin', de:'Münze', fr:'pièce', es:'moneda', it:'moneta', pl:'moneta'},
   desc:{ru:'Монета A.C.EON: что это и зачем.', en:'The A.C.EON coin: what it is and why.', de:'Die A.C.EON-Münze: was sie ist und wozu.', fr:'La pièce A.C.EON : ce que c\'est et à quoi elle sert.', es:'La moneda A.C.EON: qué es y para qué.', it:'La moneta A.C.EON: cos\'è e a cosa serve.', pl:'Moneta A.C.EON: czym jest i po co.'}},
  {id:'loda', sector:'studio', name:'LODA/OEIS', url:'../LODA/OEIS/index.html', status:'beta', w:2.1,
   tag:{ru:'наука', en:'science', de:'Wissenschaft', fr:'science', es:'ciencia', it:'scienza', pl:'nauka'},
   desc:{ru:'Совместный поиск математических последовательностей прямо в браузере.', en:'Collaborative search for integer sequences, right in the browser.', de:'Gemeinsame Suche nach Zahlenfolgen, direkt im Browser.', fr:'Recherche collaborative de suites d\'entiers, dans le navigateur.', es:'Búsqueda colaborativa de sucesiones de enteros, en el navegador.', it:'Ricerca collaborativa di successioni di interi, nel browser.', pl:'Wspólne poszukiwanie ciągów liczbowych, prosto w przeglądarce.'}},
  {id:'products', sector:'studio', name:{ru:'ТОВАРЫ', en:'PRODUCTS', de:'PRODUKTE', fr:'PRODUITS', es:'PRODUCTOS', it:'PRODOTTI', pl:'PRODUKTY'}, status:'soon', w:1.7,
   desc:{ru:'Здесь появятся продукты студии.', en:'Studio products will appear here.', de:'Hier erscheinen die Produkte des Studios.', fr:'Les produits du studio apparaîtront ici.', es:'Aquí aparecerán los productos del estudio.', it:'Qui appariranno i prodotti dello studio.', pl:'Tu pojawią się produkty studia.'}},

  /* инструменты */
  {id:'cipher', sector:'tools', name:'CIPHER', url:'../CIPHER/', status:'live', w:2.2,
   tag:{ru:'шифры', en:'ciphers', de:'Chiffren', fr:'chiffres', es:'cifrados', it:'cifrari', pl:'szyfry'},
   desc:{ru:'Шифрование и криптография: попробуй сам.', en:'Encryption and cryptography: try it yourself.', de:'Verschlüsselung und Kryptografie zum Ausprobieren.', fr:'Chiffrement et cryptographie : à essayer soi-même.', es:'Cifrado y criptografía: pruébalo tú mismo.', it:'Cifratura e crittografia: prova tu stesso.', pl:'Szyfrowanie i kryptografia: spróbuj sam.'}},
  {id:'astro', sector:'tools', name:'A.S.T.R.O', url:'../astro/', status:'live', w:2.2,
   tag:{ru:'прогноз', en:'forecast', de:'Prognose', fr:'prévisions', es:'pronóstico', it:'previsioni', pl:'prognoza'},
   desc:{ru:'Астрологический прогноз и справка.', en:'Astrological forecast and reference.', de:'Astrologische Prognose und Nachschlagewerk.', fr:'Prévisions astrologiques et références.', es:'Pronóstico astrológico y referencia.', it:'Previsioni astrologiche e riferimenti.', pl:'Prognoza astrologiczna i informacje.'}},
  {id:'nodeai', sector:'tools', name:{ru:'ОФИС ИИ', en:'AI OFFICE', de:'KI-BÜRO', fr:'BUREAU IA', es:'OFICINA IA', it:'UFFICIO IA', pl:'BIURO AI'}, url:'../chat/', status:'live', w:2.3,
   tag:{ru:'агенты студии', en:'studio agents', de:'Studio-Agenten', fr:'agents du studio', es:'agentes del estudio', it:'agenti dello studio', pl:'agenci studia'},
   desc:{ru:'ИИ-агенты студии за работой: наблюдай и поговори со свободным.', en:'The studio AI agents at work: watch them and talk to a free one.', de:'Die KI-Agenten des Studios bei der Arbeit: zuschauen und mit einem freien sprechen.', fr:'Les agents IA du studio au travail : observe-les et parle à celui qui est libre.', es:'Los agentes de IA del estudio trabajando: obsérvalos y habla con uno libre.', it:'Gli agenti IA dello studio al lavoro: osservali e parla con uno libero.', pl:'Agenci AI studia przy pracy: obserwuj ich i porozmawiaj z wolnym.'}},

  /* обучение */
  {id:'ai_course', sector:'learn', name:{ru:'КУРС AI', en:'AI COURSE', de:'KI-KURS', fr:'COURS IA', es:'CURSO IA', it:'CORSO IA', pl:'KURS AI'}, url:'../layer_00/', status:'live', w:2.3,
   tag:{ru:'работа с ИИ', en:'working with AI', de:'Arbeit mit KI', fr:'travailler avec l\'IA', es:'trabajar con IA', it:'lavorare con l\'IA', pl:'praca z AI'},
   desc:{ru:'Как работать с ИИ: курс по шагам.', en:'How to work with AI: a step-by-step course.', de:'Wie man mit KI arbeitet: ein Kurs Schritt für Schritt.', fr:'Travailler avec l\'IA : un cours pas à pas.', es:'Cómo trabajar con IA: un curso paso a paso.', it:'Come lavorare con l\'IA: un corso passo passo.', pl:'Jak pracować z AI: kurs krok po kroku.'}},
  {id:'forge', sector:'learn', name:'FORGE', url:'../forge/', status:'live', w:2.2,
   tag:{ru:'работа с кодом', en:'working with code', de:'Arbeit mit Code', fr:'travailler le code', es:'trabajar con código', it:'lavorare col codice', pl:'praca z kodem'},
   desc:{ru:'Как писать код вместе с ИИ.', en:'How to write code together with AI.', de:'Wie man gemeinsam mit KI Code schreibt.', fr:'Écrire du code avec l\'IA.', es:'Cómo escribir código junto a la IA.', it:'Come scrivere codice insieme all\'IA.', pl:'Jak pisać kod razem z AI.'}},

  /* люди */
  {id:'guestbook', sector:'people', name:{ru:'ГОСТЕВАЯ', en:'GUESTBOOK', de:'GÄSTEBUCH', fr:'LIVRE D\'OR', es:'LIBRO DE VISITAS', it:'GUESTBOOK', pl:'KSIĘGA GOŚCI'}, url:'../Guestbook/', status:'live', w:2.4,
   tag:{ru:'архив памяти', en:'memory archive', de:'Gedächtnisarchiv', fr:'archive des souvenirs', es:'archivo de memoria', it:'archivio della memoria', pl:'archiwum pamięci'},
   desc:{ru:'Оставь след в архиве памяти.', en:'Leave a trace in the memory archive.', de:'Hinterlasse eine Spur im Gedächtnisarchiv.', fr:'Laisse une trace dans l\'archive des souvenirs.', es:'Deja tu huella en el archivo de memoria.', it:'Lascia una traccia nell\'archivio della memoria.', pl:'Zostaw ślad w archiwum pamięci.'}},
  {id:'piven', sector:'people', name:'DMITRII PIVEŃ', url:'https://www.youtube.com/@dmitrypiven21', external:true, status:'live', w:2.1,
   tag:{ru:'партнёр', en:'partner', de:'Partner', fr:'partenaire', es:'socio', it:'partner', pl:'partner'},
   desc:{ru:'Канал о жизни. Помог проекту.', en:'A channel about life. Helped the project.', de:'Ein Kanal über das Leben. Hat dem Projekt geholfen.', fr:'Une chaîne sur la vie. A aidé le projet.', es:'Un canal sobre la vida. Ayudó al proyecto.', it:'Un canale sulla vita. Ha aiutato il progetto.', pl:'Kanał o życiu. Pomógł projektowi.'}},
  {id:'people_soon', sector:'people', status:'soon', w:1.6,
   desc:{ru:'Место для нового партнёра.', en:'A place for a new partner.', de:'Platz für einen neuen Partner.', fr:'Une place pour un nouveau partenaire.', es:'Un lugar para un nuevo socio.', it:'Un posto per un nuovo partner.', pl:'Miejsce dla nowego partnera.'}}
];
