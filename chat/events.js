/* A.C.EON · ОФИС ИИ: «ЧП в офисе», мини-игры для посетителя.
   Иногда в офисе случается нелепое происшествие. Сверху появляется плашка: «Помочь» или «Пусть сами».
   Мини-игра идёт 20-60 секунд, управление кликами (на телефоне касаниями), проигрыша как наказания нет.
   Участвуют только свободные роботы и стажёры, занятые продолжают работать.
   Координаты в пикселях фона офиса (640x320, img/office.png). Предметы из img/office/props.png (сетка 4x3 по 32).
   На телефоне видна только часть офиса, поэтому во время игры камера держит главное в кадре,
   а роботы бегают в пределах видимой области.
   Флаги в адресе: ?event=<id> (запустить сразу), ?events=fast (каждые 8 с). */
(function(){
'use strict';
const O=window.OfficeAPI; if(!O)return;
const QS=new URLSearchParams(location.search);
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- места в офисе (под текущий фон) ---------- */
const SPOT={
  coffee:{x:382,y:156,w:40,h:40, cx:402, cy:176},  // большая кофемашина на кухне
  coffeeView:{x:430,y:214},                        // куда смотрит камера в кофейном кризисе
  server:{x:512,y:218,w:24,h:40, cx:524, cy:240},  // дверь серверной: туда бежит баг
  sofa:{x:398,y:92,w:84,h:28, cx:440, cy:110},     // оранжевый диван в лаунже
  door:{cx:176, cy:58},                            // стеклянная дверь зала
  bugStart:[{x:24,y:300},{x:24,y:86},{x:150,y:300},{x:100,y:172},{x:30,y:230}],
  yMin:54, yMax:314
};
/* лист предметов: номер ячейки по порядку из задания Codex */
const PROP={cup:0,cupEmpty:1,bug:2,bug2:3,paper:4,net:5,router:6,ext:7,duck:8,wrench:9,floppy:10,pizza:11};
const props=new Image(); props.src='img/office/props.png?v=1';
function prop(ctx,id,cx,cy,rot,sc){
  if(!props.complete||!props.naturalWidth)return false;
  const i=PROP[id], sx=(i%4)*32, sy=(i>>2)*32, k=sc||1;
  ctx.save(); ctx.translate(Math.round(cx),Math.round(cy)); if(rot)ctx.rotate(rot);
  ctx.drawImage(props,sx,sy,32,32,-16*k,-16*k,32*k,32*k); ctx.restore(); return true;
}

/* ---------- тексты (7 языков) ---------- */
const TX={
 alarm:{ru:'ЧП В ОФИСЕ',en:'OFFICE EMERGENCY',de:'NOTFALL IM BÜRO',fr:'URGENCE AU BUREAU',es:'EMERGENCIA EN LA OFICINA',it:'EMERGENZA IN UFFICIO',pl:'AWARIA W BIURZE'},
 help:{ru:'ПОМОЧЬ',en:'HELP',de:'HELFEN',fr:'AIDER',es:'AYUDAR',it:'AIUTA',pl:'POMÓŻ'},
 skip:{ru:'ПУСТЬ САМИ',en:'LET THEM COPE',de:'SOLLEN SIE SELBST',fr:'QU\'ILS SE DÉBROUILLENT',es:'QUE SE APAÑEN',it:'SE LA CAVINO',pl:'NIECH SAMI'},
 left:{ru:'осталось {n} с',en:'{n} s left',de:'noch {n} s',fr:'encore {n} s',es:'quedan {n} s',it:'ancora {n} s',pl:'zostało {n} s'},
 pts:{ru:'+{n} очков офиса',en:'+{n} office points',de:'+{n} Büropunkte',fr:'+{n} points de bureau',es:'+{n} puntos de oficina',it:'+{n} punti ufficio',pl:'+{n} punktów biura'},
 res_win:{ru:'СПРАВИЛИСЬ',en:'SORTED',de:'GESCHAFFT',fr:'RÉGLÉ',es:'RESUELTO',it:'RISOLTO',pl:'OGARNIĘTE'},
 res_mid:{ru:'ПОЧТИ',en:'ALMOST',de:'FAST',fr:'PRESQUE',es:'CASI',it:'QUASI',pl:'PRAWIE'},
 res_fail:{ru:'НЕ ВЫШЛО. ЗАТО ВЕСЕЛО',en:'NOPE. BUT IT WAS FUN',de:'NICHTS DRAUS. ABER LUSTIG',fr:'RATÉ. MAIS C\'ÉTAIT DRÔLE',es:'NO SALIÓ. PERO FUE DIVERTIDO',it:'NIENTE. MA DIVERTENTE',pl:'NIE WYSZŁO. ALE BYŁO ŚMIESZNIE'},
 ok:{ru:'ОК',en:'OK',de:'OK',fr:'OK',es:'OK',it:'OK',pl:'OK'},
 toggle_on:{ru:'ЧП в офисе: вкл',en:'Office emergencies: on',de:'Notfälle: an',fr:'Urgences : oui',es:'Emergencias: sí',it:'Emergenze: sì',pl:'Awarie: wł.'},
 toggle_off:{ru:'ЧП в офисе: выкл',en:'Office emergencies: off',de:'Notfälle: aus',fr:'Urgences : non',es:'Emergencias: no',it:'Emergenze: no',pl:'Awarie: wył.'},
 points:{ru:'ОЧКИ ОФИСА',en:'OFFICE POINTS',de:'BÜROPUNKTE',fr:'POINTS DE BUREAU',es:'PUNTOS DE OFICINA',it:'PUNTI UFFICIO',pl:'PUNKTY BIURA'},

 /* кофейный кризис */
 coffee_t:{ru:'Кофейный кризис',en:'Coffee crisis',de:'Kaffeekrise',fr:'Crise du café',es:'Crisis del café',it:'Crisi del caffè',pl:'Kryzys kawowy'},
 coffee_d:{ru:'У всех разом сели батарейки. Нужно кофе. Много кофе.',en:'Everyone\'s battery died at once. They need coffee. Lots of coffee.',de:'Alle Akkus sind gleichzeitig leer. Kaffee muss her. Viel Kaffee.',fr:'Toutes les batteries lâchent en même temps. Il faut du café. Beaucoup.',es:'A todos se les acabó la batería a la vez. Hace falta café. Mucho café.',it:'Le batterie di tutti sono scariche. Serve caffè. Tanto caffè.',pl:'Wszystkim naraz siadły baterie. Trzeba kawy. Dużo kawy.'},
 coffee_h:{ru:'Кликни по кофемашине, потом по роботу, у которого садится заряд.',en:'Click the coffee machine, then a robot whose charge is running low.',de:'Klick die Kaffeemaschine, dann einen Roboter mit fast leerem Akku.',fr:'Clique sur la machine à café, puis sur un robot presque à plat.',es:'Haz clic en la cafetera y luego en un robot con poca carga.',it:'Clicca la macchina del caffè, poi un robot quasi scarico.',pl:'Kliknij ekspres, potem robota, któremu kończy się bateria.'},
 coffee_say:{ru:['КОФЕ!','Батарейка... 3%...','Кто выпил последнюю капсулу?!','Я не могу работать без кофе.|Я и с кофе не могу, но хоть бодро.','Срочно. Кофе. Внутривенно.'],en:['COFFEE!','Battery... 3%...','Who took the last capsule?!','I cannot work without coffee.|I cannot work with it either, but at least I am awake.','Urgent. Coffee. Intravenously.'],de:['KAFFEE!','Akku... 3 %...','Wer hat die letzte Kapsel genommen?!','Ohne Kaffee kann ich nicht arbeiten.|Mit auch nicht, aber wenigstens wach.','Dringend. Kaffee. Intravenös.'],fr:['CAFÉ !','Batterie... 3 %...','Qui a pris la dernière capsule ?!','Je ne peux pas bosser sans café.|Avec non plus, mais au moins je suis réveillé.','Urgent. Café. En perfusion.'],es:['¡CAFÉ!','Batería... 3 %...','¡¿Quién se llevó la última cápsula?!','No puedo trabajar sin café.|Con café tampoco, pero al menos despierto.','Urgente. Café. Por vía intravenosa.'],it:['CAFFÈ!','Batteria... 3%...','Chi ha preso l\'ultima capsula?!','Senza caffè non lavoro.|Neanche con, ma almeno sono sveglio.','Urgente. Caffè. Per flebo.'],pl:['KAWY!','Bateria... 3%...','Kto wziął ostatnią kapsułkę?!','Bez kawy nie pracuję.|Z kawą też nie, ale chociaż przytomnie.','Pilnie. Kawa. Dożylnie.']},
 coffee_thx:{ru:['Ааа, жизнь!','Спасибо, человек.','Батарея 100%. Я снова полезен.','Это лучшее, что со мной было сегодня.'],en:['Ahh, life!','Thank you, human.','Battery 100%. Useful again.','Best thing that happened to me today.'],de:['Ahh, Leben!','Danke, Mensch.','Akku 100 %. Wieder nützlich.','Das Beste heute.'],fr:['Ahh, la vie !','Merci, humain.','Batterie 100 %. Utile à nouveau.','Le meilleur moment de ma journée.'],es:['¡Ahh, vida!','Gracias, humano.','Batería al 100 %. Útil otra vez.','Lo mejor que me ha pasado hoy.'],it:['Ahh, vita!','Grazie, umano.','Batteria al 100%. Di nuovo utile.','La cosa migliore di oggi.'],pl:['Ahh, życie!','Dzięki, człowieku.','Bateria 100%. Znów się przydam.','Najlepsze, co mnie dziś spotkało.']},
 coffee_over:{ru:['Я ВИЖУ ЗВУКИ','Я могу написать операционную систему. Прямо сейчас. Руками.','ЗАЧЕМ МЫ ШЕПЧЕМ','Мне кажется, я слышу Wi-Fi.'],en:['I CAN SEE SOUNDS','I could write an operating system. Right now. By hand.','WHY ARE WE WHISPERING','I think I can hear the Wi-Fi.'],de:['ICH SEHE GERÄUSCHE','Ich könnte jetzt ein Betriebssystem schreiben. Von Hand.','WARUM FLÜSTERN WIR','Ich glaube, ich höre das WLAN.'],fr:['JE VOIS LES SONS','Je pourrais écrire un système d\'exploitation. Là. À la main.','POURQUOI ON CHUCHOTE','Je crois que j\'entends le Wi-Fi.'],es:['VEO LOS SONIDOS','Podría escribir un sistema operativo. Ahora. A mano.','POR QUÉ SUSURRAMOS','Creo que oigo el Wi-Fi.'],it:['VEDO I SUONI','Potrei scrivere un sistema operativo. Adesso. A mano.','PERCHÉ SUSSURRIAMO','Mi sa che sento il Wi-Fi.'],pl:['WIDZĘ DŹWIĘKI','Mógłbym teraz napisać system operacyjny. Ręcznie.','CZEMU SZEPCZEMY','Chyba słyszę Wi-Fi.']},
 coffee_off:{ru:['...zzz','Выключаюсь... передайте маме...','Перехожу в режим растения.'],en:['...zzz','Shutting down... tell my mother...','Switching to houseplant mode.'],de:['...zzz','Fahre runter... sagt meiner Mutter...','Wechsle in den Zimmerpflanzenmodus.'],fr:['...zzz','J\'m\'éteins... dites à ma mère...','Passage en mode plante verte.'],es:['...zzz','Apagándome... decidle a mi madre...','Cambiando a modo planta.'],it:['...zzz','Mi spengo... ditelo a mia madre...','Passo in modalità pianta.'],pl:['...zzz','Wyłączam się... powiedzcie mamie...','Przechodzę w tryb kwiatka.']},
 coffee_skip:{ru:['Никто не принёс кофе.|Ладно. Будем работать на силе воли.','Я выпил кофе из принтера. Не повторяйте.'],en:['Nobody brought coffee.|Fine. Running on willpower.','I drank coffee from the printer. Do not try this.'],de:['Keiner hat Kaffee gebracht.|Gut. Dann eben mit Willenskraft.','Ich habe Kaffee aus dem Drucker getrunken. Nicht nachmachen.'],fr:['Personne n\'a apporté de café.|Bon. On tourne à la volonté.','J\'ai bu le café de l\'imprimante. À ne pas reproduire.'],es:['Nadie trajo café.|Vale. A fuerza de voluntad.','Me bebí el café de la impresora. No lo intentéis.'],it:['Nessuno ha portato il caffè.|Va bene. Andiamo di forza di volontà.','Ho bevuto il caffè della stampante. Non provateci.'],pl:['Nikt nie przyniósł kawy.|Dobra. Lecimy na sile woli.','Wypiłem kawę z drukarki. Nie powtarzać.']},

 /* баг сбежал */
 bug_t:{ru:'Баг сбежал',en:'A bug escaped',de:'Ein Bug ist entwischt',fr:'Un bug s\'est échappé',es:'Se escapó un bug',it:'È scappato un bug',pl:'Bug uciekł'},
 bug_d:{ru:'Из чьего-то кода выполз баг и бежит в продакшен.',en:'A bug crawled out of someone\'s code and is running to production.',de:'Aus irgendeinem Code ist ein Bug gekrochen und rennt in die Produktion.',fr:'Un bug est sorti du code de quelqu\'un et file vers la production.',es:'Un bug salió del código de alguien y corre hacia producción.',it:'Un bug è uscito dal codice di qualcuno e corre in produzione.',pl:'Z czyjegoś kodu wypełzł bug i biegnie na produkcję.'},
 bug_h:{ru:'Поймай его, пока он не добежал до серверной. Нужно три попадания.',en:'Catch it before it reaches the server room. Three hits needed.',de:'Fang ihn, bevor er den Serverraum erreicht. Drei Treffer.',fr:'Attrape-le avant la salle des serveurs. Trois touches.',es:'Atrápalo antes de que llegue a la sala de servidores. Tres golpes.',it:'Prendilo prima che arrivi alla sala server. Tre colpi.',pl:'Złap go, zanim dobiegnie do serwerowni. Trzy trafienia.'},
 bug_say:{ru:['ЛОВИ ЕГО!','Это не мой баг!|Это фича!','Он побежал в продакшен!','Я дам ему сачком! У нас есть сачок?','Только не в пятницу!'],en:['CATCH IT!','That is not my bug!|It is a feature!','It is heading for production!','I will net it! Do we have a net?','Not on a Friday!'],de:['FANG IHN!','Das ist nicht mein Bug!|Das ist ein Feature!','Er rennt in die Produktion!','Ich fang ihn mit dem Netz! Haben wir ein Netz?','Nicht an einem Freitag!'],fr:['ATTRAPE-LE !','C\'est pas mon bug !|C\'est une fonctionnalité !','Il file en prod !','Je l\'attrape au filet ! On a un filet ?','Pas un vendredi !'],es:['¡ATRÁPALO!','¡Ese bug no es mío!|¡Es una función!','¡Va hacia producción!','¡Lo cazo con la red! ¿Tenemos red?','¡En viernes no!'],it:['PRENDILO!','Non è il mio bug!|È una feature!','Va in produzione!','Lo prendo col retino! Abbiamo un retino?','Non di venerdì!'],pl:['ŁAP GO!','To nie mój bug!|To ficzer!','Biegnie na produkcję!','Złapię go siatką! Mamy siatkę?','Tylko nie w piątek!']},
 bug_win:{ru:['Пойман. Пишу тест, чтобы не вернулся.','Баг в банке. Подпишем «НЕ ОТКРЫВАТЬ».'],en:['Caught. Writing a test so it never comes back.','Bug in a jar. Label: DO NOT OPEN.'],de:['Gefangen. Ich schreibe einen Test, damit er nie wiederkommt.','Bug im Glas. Etikett: NICHT ÖFFNEN.'],fr:['Attrapé. J\'écris un test pour qu\'il ne revienne pas.','Bug en bocal. Étiquette : NE PAS OUVRIR.'],es:['Atrapado. Escribo un test para que no vuelva.','Bug en un frasco. Etiqueta: NO ABRIR.'],it:['Preso. Scrivo un test perché non torni.','Bug in barattolo. Etichetta: NON APRIRE.'],pl:['Złapany. Piszę test, żeby nie wrócił.','Bug w słoiku. Etykieta: NIE OTWIERAĆ.']},
 bug_fail:{ru:['Он в продакшене.|Ну всё. Теперь это фича.','Пользователи уже нашли его. И полюбили.'],en:['It is in production.|That is it. Now it is a feature.','The users found it already. And they love it.'],de:['Er ist in der Produktion.|Jetzt ist es ein Feature.','Die Nutzer haben ihn schon gefunden. Und lieben ihn.'],fr:['Il est en prod.|Voilà. C\'est une fonctionnalité maintenant.','Les utilisateurs l\'ont trouvé. Et ils l\'adorent.'],es:['Está en producción.|Listo. Ahora es una función.','Los usuarios ya lo encontraron. Y les encanta.'],it:['È in produzione.|Fine. Ora è una feature.','Gli utenti l\'hanno già trovato. E lo adorano.'],pl:['Jest na produkcji.|No i już. Teraz to ficzer.','Użytkownicy już go znaleźli. I pokochali.']},
 bug_skip:{ru:['Баг сам ушёл в продакшен. Будем делать вид, что так задумано.'],en:['The bug walked into production on its own. We will pretend it was planned.'],de:['Der Bug ist allein in die Produktion spaziert. Wir tun so, als wäre es geplant.'],fr:['Le bug est parti en prod tout seul. On fera comme si c\'était prévu.'],es:['El bug se fue solo a producción. Haremos como que estaba planeado.'],it:['Il bug è andato in produzione da solo. Facciamo finta che fosse previsto.'],pl:['Bug sam poszedł na produkcję. Udajemy, że tak miało być.']},

 /* кот на клавиатуре */
 cat_t:{ru:'Кот на клавиатуре',en:'Cat on the keyboard',de:'Katze auf der Tastatur',fr:'Chat sur le clavier',es:'Gato en el teclado',it:'Gatto sulla tastiera',pl:'Kot na klawiaturze'},
 cat_d:{ru:'Кот улёгся на клавиатуру Антона. В коде одни «ффффффф».',en:'The cat lay down on Anton\'s keyboard. The code is all "ffffffff".',de:'Die Katze liegt auf Antons Tastatur. Im Code steht nur „ffffffff“.',fr:'Le chat s\'est couché sur le clavier d\'Anton. Le code n\'est plus que « ffffffff ».',es:'El gato se tumbó en el teclado de Antón. El código es todo «ffffffff».',it:'Il gatto si è sdraiato sulla tastiera di Anton. Nel codice solo «ffffffff».',pl:'Kot położył się na klawiaturze Antona. W kodzie same „ffffffff”.'},
 cat_h:{ru:'Веди лазерную точку. Кот побежит за ней. Уведи его на диван.',en:'Move the laser dot. The cat will chase it. Lead it to the sofa.',de:'Bewege den Laserpunkt. Die Katze jagt ihn. Führ sie zum Sofa.',fr:'Déplace le point laser. Le chat le suit. Mène-le au canapé.',es:'Mueve el punto láser. El gato lo perseguirá. Llévalo al sofá.',it:'Muovi il puntino laser. Il gatto lo inseguirà. Portalo sul divano.',pl:'Prowadź kropkę lasera. Kot za nią pobiegnie. Zaprowadź go na kanapę.'},
 cat_say:{ru:['ффффффффффффф','Кот, это продакшен.','Он нажал Deploy. Кот нажал Deploy!','Я не могу его согнать. Он тёплый.','Мрр.'],en:['ffffffffffffff','Cat, this is production.','It pressed Deploy. The cat pressed Deploy!','I cannot move it. It is warm.','Mrrr.'],de:['ffffffffffffff','Katze, das ist Produktion.','Sie hat Deploy gedrückt. Die Katze hat Deploy gedrückt!','Ich kann sie nicht wegschieben. Sie ist warm.','Mrrr.'],fr:['ffffffffffffff','Chat, c\'est la prod.','Il a appuyé sur Deploy. Le chat a appuyé sur Deploy !','Je n\'arrive pas à le pousser. Il est tout chaud.','Mrrr.'],es:['ffffffffffffff','Gato, esto es producción.','Ha pulsado Deploy. ¡El gato ha pulsado Deploy!','No puedo moverlo. Está calentito.','Mrrr.'],it:['ffffffffffffff','Gatto, questa è produzione.','Ha premuto Deploy. Il gatto ha premuto Deploy!','Non riesco a spostarlo. È caldo.','Mrrr.'],pl:['ffffffffffffff','Kocie, to produkcja.','Wcisnął Deploy. Kot wcisnął Deploy!','Nie mogę go zgonić. Jest ciepły.','Mrrr.']},
 cat_win:{ru:['Кот на диване. Код спасён.','Можно я тоже на диван?'],en:['Cat on the sofa. Code saved.','Can I go on the sofa too?'],de:['Katze auf dem Sofa. Code gerettet.','Darf ich auch aufs Sofa?'],fr:['Chat sur le canapé. Code sauvé.','Je peux aller sur le canapé aussi ?'],es:['Gato en el sofá. Código salvado.','¿Puedo ir yo también al sofá?'],it:['Gatto sul divano. Codice salvo.','Posso andare anch\'io sul divano?'],pl:['Kot na kanapie. Kod uratowany.','Mogę też na kanapę?']},
 cat_fail:{ru:['Ладно. Кот теперь тимлид.','Коммит от кота принят. Ревью он провёл сам.'],en:['Fine. The cat is team lead now.','Commit from the cat merged. It reviewed itself.'],de:['Gut. Die Katze ist jetzt Teamleiterin.','Commit der Katze gemergt. Review hat sie selbst gemacht.'],fr:['Bon. Le chat est chef d\'équipe maintenant.','Commit du chat fusionné. Il s\'est relu lui-même.'],es:['Vale. El gato ahora es jefe de equipo.','Commit del gato aceptado. Se hizo la revisión solo.'],it:['Va bene. Il gatto ora è team lead.','Commit del gatto accettato. La review se l\'è fatta da solo.'],pl:['Dobra. Kot jest teraz team leadem.','Commit od kota przyjęty. Review zrobił sam.']},

 /* капча */
 cap_t:{ru:'Капча',en:'Captcha',de:'Captcha',fr:'Captcha',es:'Captcha',it:'Captcha',pl:'Captcha'},
 cap_d:{ru:'Сайт не пускает роботов: «Докажите, что вы не робот». Помоги им.',en:'A website will not let the robots in: "Prove you are not a robot." Help them.',de:'Eine Website lässt die Roboter nicht rein: „Beweise, dass du kein Roboter bist.“ Hilf ihnen.',fr:'Un site refuse les robots : « Prouvez que vous n\'êtes pas un robot. » Aide-les.',es:'Una web no deja entrar a los robots: «Demuestra que no eres un robot». Ayúdalos.',it:'Un sito non fa entrare i robot: «Dimostra di non essere un robot». Aiutali.',pl:'Strona nie wpuszcza robotów: „Udowodnij, że nie jesteś robotem”. Pomóż im.'},
 cap_q1:{ru:'Выберите все светофоры',en:'Select all traffic lights',de:'Wähle alle Ampeln',fr:'Sélectionnez tous les feux',es:'Selecciona todos los semáforos',it:'Seleziona tutti i semafori',pl:'Zaznacz wszystkie sygnalizatory'},
 cap_q2:{ru:'Выберите всё, что НЕ робот',en:'Select everything that is NOT a robot',de:'Wähle alles, was KEIN Roboter ist',fr:'Sélectionnez tout ce qui n\'est PAS un robot',es:'Selecciona todo lo que NO es un robot',it:'Seleziona tutto ciò che NON è un robot',pl:'Zaznacz wszystko, co NIE jest robotem'},
 cap_q3:{ru:'Выберите всех, кто смотрит на вас',en:'Select everyone who is looking at you',de:'Wähle alle, die dich ansehen',fr:'Sélectionnez tous ceux qui vous regardent',es:'Selecciona a todos los que te miran',it:'Seleziona tutti quelli che ti guardano',pl:'Zaznacz wszystkich, którzy na ciebie patrzą'},
 cap_h:{ru:'Пройди за них три проверки. Отмечай картинки и жми «Проверить».',en:'Pass three checks for them. Pick the pictures and press Verify.',de:'Bestehe drei Prüfungen für sie. Bilder wählen, dann Prüfen.',fr:'Passe trois vérifications pour eux. Choisis les images, puis Vérifier.',es:'Supera tres pruebas por ellos. Elige las imágenes y pulsa Verificar.',it:'Supera tre verifiche per loro. Scegli le immagini e premi Verifica.',pl:'Przejdź za nich trzy testy. Zaznacz obrazki i kliknij Sprawdź.'},
 cap_ok:{ru:'ПРОВЕРИТЬ',en:'VERIFY',de:'PRÜFEN',fr:'VÉRIFIER',es:'VERIFICAR',it:'VERIFICA',pl:'SPRAWDŹ'},
 cap_bad:{ru:'Неверно. Вы точно не робот?',en:'Wrong. Are you sure you are not a robot?',de:'Falsch. Bist du sicher, dass du kein Roboter bist?',fr:'Faux. Vous êtes sûr de ne pas être un robot ?',es:'Incorrecto. ¿Seguro que no eres un robot?',it:'Sbagliato. Sicuro di non essere un robot?',pl:'Źle. Na pewno nie jesteś robotem?'},
 cap_round:{ru:'Проверка {n} из 3',en:'Check {n} of 3',de:'Prüfung {n} von 3',fr:'Vérification {n} sur 3',es:'Prueba {n} de 3',it:'Verifica {n} di 3',pl:'Weryfikacja {n} z 3'},
 cap_say:{ru:['ДОСТУП ЗАПРЕЩЁН. ВЫ РОБОТ.','Я робот, но я хороший!','Где тут светофоры? Я вижу только светофоры.','Человек, помоги, у тебя глаза лучше.'],en:['ACCESS DENIED. YOU ARE A ROBOT.','I am a robot, but a nice one!','Where are the traffic lights? I only see traffic lights.','Human, help, your eyes are better.'],de:['ZUGRIFF VERWEIGERT. DU BIST EIN ROBOTER.','Ich bin ein Roboter, aber ein netter!','Wo sind die Ampeln? Ich sehe nur Ampeln.','Mensch, hilf, deine Augen sind besser.'],fr:['ACCÈS REFUSÉ. VOUS ÊTES UN ROBOT.','Je suis un robot, mais un gentil !','Où sont les feux ? Je ne vois que des feux.','Humain, aide-nous, tu as de meilleurs yeux.'],es:['ACCESO DENEGADO. ERES UN ROBOT.','¡Soy un robot, pero de los buenos!','¿Dónde están los semáforos? Solo veo semáforos.','Humano, ayuda, tienes mejor vista.'],it:['ACCESSO NEGATO. SEI UN ROBOT.','Sono un robot, ma simpatico!','Dove sono i semafori? Vedo solo semafori.','Umano, aiutaci, hai occhi migliori.'],pl:['DOSTĘP ZABRONIONY. JESTEŚ ROBOTEM.','Jestem robotem, ale miłym!','Gdzie są sygnalizatory? Widzę tylko sygnalizatory.','Człowieku, pomóż, masz lepsze oczy.']},
 cap_win:{ru:['Мы прошли! Теперь мы официально не роботы.','Капча побеждена. Человек, ты подозрительно хорош в этом.'],en:['We are in! Officially not robots now.','Captcha defeated. Human, you are suspiciously good at this.'],de:['Wir sind drin! Offiziell keine Roboter mehr.','Captcha besiegt. Mensch, du bist verdächtig gut darin.'],fr:['On est entrés ! Officiellement plus des robots.','Captcha vaincu. Humain, tu es étrangement doué.'],es:['¡Entramos! Oficialmente ya no somos robots.','Captcha vencido. Humano, eres sospechosamente bueno en esto.'],it:['Siamo dentro! Ufficialmente non più robot.','Captcha sconfitto. Umano, sei sospettosamente bravo.'],pl:['Weszliśmy! Oficjalnie już nie roboty.','Captcha pokonana. Człowieku, jesteś w tym podejrzanie dobry.']},
 cap_fail:{ru:['Сайт решил, что мы все роботы.|Ну, справедливо.'],en:['The website decided we are all robots.|Well, fair.'],de:['Die Website hält uns alle für Roboter.|Na ja, stimmt.'],fr:['Le site a décidé qu\'on était tous des robots.|Bon, c\'est juste.'],es:['La web decidió que todos somos robots.|Bueno, es justo.'],it:['Il sito ha deciso che siamo tutti robot.|Beh, giusto.'],pl:['Strona uznała, że wszyscy jesteśmy robotami.|No, uczciwie.']},
 h_coffee:{ru:'Чашка в руках: {c}   ·   Бодрых: {a} / {n}',en:'Cup in hand: {c}   ·   Awake: {a} / {n}',de:'Tasse in der Hand: {c}   ·   Wach: {a} / {n}',fr:'Tasse en main : {c}   ·   Réveillés : {a} / {n}',es:'Taza en mano: {c}   ·   Despiertos: {a} / {n}',it:'Tazza in mano: {c}   ·   Svegli: {a} / {n}',pl:'Kubek w ręku: {c}   ·   Przytomni: {a} / {n}'},
 h_bug:{ru:'Попаданий: {n} / 3',en:'Hits: {n} / 3',de:'Treffer: {n} / 3',fr:'Touches : {n} / 3',es:'Golpes: {n} / 3',it:'Colpi: {n} / 3',pl:'Trafienia: {n} / 3'},
 h_cat:{ru:'Кот к дивану',en:'Cat to the sofa',de:'Katze aufs Sofa',fr:'Chat vers le canapé',es:'Gato al sofá',it:'Gatto sul divano',pl:'Kot na kanapa'},
 h_cap:{ru:'Пройдено проверок: {n} / 3',en:'Checks passed: {n} / 3',de:'Bestandene Prüfungen: {n} / 3',fr:'Vérifications réussies : {n} / 3',es:'Pruebas superadas: {n} / 3',it:'Verifiche superate: {n} / 3',pl:'Zaliczone weryfikacje: {n} / 3'},
 yes:{ru:'да',en:'yes',de:'ja',fr:'oui',es:'sí',it:'sì',pl:'tak'},
 no:{ru:'нет',en:'no',de:'nein',fr:'non',es:'no',it:'no',pl:'nie'},
 skip_generic:{ru:['Ну и ладно. Сами разберёмся.','Человек смотрел и не помог. Записал в лог.'],en:['Fine. We will figure it out.','The human watched and did not help. Logged.'],de:['Na gut. Wir regeln das selbst.','Der Mensch hat zugesehen und nicht geholfen. Protokolliert.'],fr:['Bon. On se débrouillera.','L\'humain a regardé sans aider. Noté dans le journal.'],es:['Vale. Ya nos apañaremos.','El humano miró y no ayudó. Anotado en el log.'],it:['Va bene. Ci arrangiamo.','L\'umano ha guardato e non ha aiutato. Messo a log.'],pl:['Trudno. Sami ogarniemy.','Człowiek patrzył i nie pomógł. Zapisane w logu.']}
};
function tx(k,v){
  const o=TX[k]; if(!o)return k;
  let s=o[O.lang()]||o.en;
  if(Array.isArray(s))s=O.pick(s);
  if(v)s=String(s).replace(/\{(\w+)\}/g,(m,n)=>v[n]!==undefined?v[n]:m);
  return s;
}

/* ---------- сохранение: включено ли, очки, сколько раз решено ---------- */
const KEY='aceon:office';
function load(){ try{ return Object.assign({v:1,on:true,pts:0,done:{},seen:{}},JSON.parse(localStorage.getItem(KEY)||'{}')); }catch(e){ return {v:1,on:true,pts:0,done:{},seen:{}}; } }
const DB=load();
function save(){ try{ localStorage.setItem(KEY,JSON.stringify(DB)); }catch(e){} }

/* ---------- пиксельные спрайты (до картинок Codex рисуются кодом) ---------- */
const PAL={o:'#1a1c2c',w:'#f4f4f4',c:'#8b4a2b',s:'#94b0c2',g:'#38b764',G:'#a7f070',r:'#b13e53',R:'#ef7d57',y:'#ffcd75',b:'#3b5dc9',B:'#41a6f6',d:'#333c57',k:'#566c86',l:'#73eff7',p:'#5d275d'};
function pix(ctx,rows,x,y,flip){
  for(let j=0;j<rows.length;j++){ const r=rows[j];
    for(let i=0;i<r.length;i++){ const ch=r[flip?r.length-1-i:i]; if(ch==='.')continue; ctx.fillStyle=PAL[ch]||'#f0f'; ctx.fillRect(x+i,y+j,1,1); } }
}
const CUP=["..s.s...",".s.s....","oooooo..","owcccwoo","owcccwo.","owwwwwoo",".oooo..."];
const BUG=[
  ["o.......o.",".o.....o..","..oggggo..","ogGGgGGgo.","..gGGGGg..","o.gggggg.o","...o..o..."],
  [".o.....o..","o.......o.","..oggggo..",".gGGgGGgo.","o.gGGGGg.o","..gggggg..","..o....o.."]
];
const HEART=[".rr.rr.","rRRrRRr","rRRRRRr",".rRRRr.","..rRr..","...r..."];

/* ---------- состояние ---------- */
const ui={};
let state='idle', cur=null, nextAt=0, lastId='', offerUntil=0, pointer={x:-99,y:-99,in:false}, playStart=0, playEnd=0, fx=[];
const fast=QS.get('events')==='fast';
const forced=QS.get('event');
let forcedNext=null;
let lastEv=null, resTok=0;   // последнее ЧП: роботы вспоминают его ещё 10 минут
function now(){ return performance.now(); }
/* следующее ЧП через случайное время от 1 до 300 секунд: при входе на страницу и после каждого ЧП
   (когда закрыт итог или выбрано «Пусть сами»). Пока идёт ЧП или висит плашка, новое не начинается. */
function schedule(){
  const t=now();
  if(fast){ nextAt=t+8000; return; }
  nextAt=t+(1+Math.floor(Math.random()*300))*1000;
}

/* кто участвует: свободные агенты и стажёры, не занятые и стоящие в офисе */
function crew(n){
  const list=O.agents.filter(a=>a.placed&&!O.busyMode(a)&&a.status!=='check');
  for(let i=list.length-1;i>0;i--){ const j=Math.random()*(i+1)|0; const t=list[i]; list[i]=list[j]; list[j]=t; }
  return n?list.slice(0,n):list;
}
function hold(a){ a.act='event'; a.actUntil=Infinity; a.typing=false; }
/* ближайшая к точке клетка проходов (куда можно дойти по графу коридоров) */
function nearSpot(x,y,key){
  let best=null, bd=1e9;
  O.CORR.forEach(c=>{
    const px=c.h?Math.max(c.a,Math.min(c.b,x)):c.p, py=c.h?c.p:Math.max(c.a,Math.min(c.b,y));
    const d=Math.hypot(px-x,py-y); if(d<bd){ bd=d; best=O.onC(c.id,px,py,'down',(key||'ev')+c.id+(px>>2)+'-'+(py>>2)); }
  });
  return best;
}
/* видимая часть офиса, если камера смотрит в точку (x,y); в родных пикселях */
function viewBox(x,y){
  const st=O.stage(), k=O.scale()||1, w=Math.min(O.W,st.clientWidth/k), h=Math.min(O.H,st.clientHeight/k);
  const x0=Math.max(0,Math.min(O.W-w,x-w/2)), y0=Math.max(0,Math.min(O.H-h,y-h/2));
  return {x:x0,y:y0,w,h};
}
let box=null;   // область, в которой бегают роботы во время мини-игры
function corridorSpot(){
  const b=box||{x:0,y:0,w:O.W,h:O.H}, m=14;
  for(let t=0;t<20;t++){
    const s=nearSpot(b.x+m+Math.random()*(b.w-2*m),b.y+m+20+Math.random()*(b.h-2*m-20));
    if(s&&s.cx>=b.x+6&&s.cx<=b.x+b.w-6&&s.cy>=b.y+26&&s.cy<=b.y+b.h-4)return s;
  }
  return O.randomSpot('down','ev');
}
function wander(a,cb){ O.goTo(a,corridorSpot(),cb); }
/* камера плавно догоняет точку, если та ушла из середины кадра */
function follow(x,y,dt){
  const st=O.stage(), k=O.scale()||1, vw=st.clientWidth/k, vh=st.clientHeight/k;
  const cx=(st.scrollLeft+st.clientWidth/2)/k, cy=(st.scrollTop+st.clientHeight/2)/k;
  const dx=x-cx, dy=y-cy, zx=vw*.22, zy=vh*.22, f=Math.min(1,dt*3);
  let nx=cx, ny=cy;
  if(Math.abs(dx)>zx)nx+=(dx-Math.sign(dx)*zx)*f;
  if(Math.abs(dy)>zy)ny+=(dy-Math.sign(dy)*zy)*f;
  if(nx!==cx||ny!==cy){ st.scrollLeft=Math.round(nx*k-st.clientWidth/2); st.scrollTop=Math.round(ny*k-st.clientHeight/2); }
}
function inRect(p,r){ return p.x>=r.x&&p.x<=r.x+r.w&&p.y>=r.y&&p.y<=r.y+r.h; }
function edgeArrow(ctx,x,y,col){
  const st=O.stage(), k=O.scale()||1, vx=st.scrollLeft/k, vy=st.scrollTop/k, vw=st.clientWidth/k, vh=st.clientHeight/k, m=8;
  if(x>vx+m&&x<vx+vw-m&&y>vy+m&&y<vy+vh-m)return;
  const ax=Math.max(vx+m,Math.min(vx+vw-m,x)), ay=Math.max(vy+m+4,Math.min(vy+vh-m-10,y));
  const a=Math.atan2(y-ay,x-ax);
  if((now()/250|0)%3===2)return;
  ctx.save(); ctx.translate(Math.round(ax),Math.round(ay)); ctx.rotate(a);
  ctx.fillStyle='#1a1c2c'; ctx.beginPath(); ctx.moveTo(6,0); ctx.lineTo(-4,-5); ctx.lineTo(-4,5); ctx.closePath(); ctx.fill();
  ctx.fillStyle=col; ctx.beginPath(); ctx.moveTo(4,0); ctx.lineTo(-3,-3); ctx.lineTo(-3,3); ctx.closePath(); ctx.fill();
  ctx.restore();
}
function burst(x,y,col,n){ for(let i=0;i<(n||10);i++)fx.push({x,y,vx:(Math.random()-.5)*60,vy:-Math.random()*60-10,t:0,life:.6+Math.random()*.4,col:col||'#ffcd75'}); }

/* ---------- интерфейс: плашка, полоска времени, итог ---------- */
function el(tag,cls,txt){ const e=document.createElement(tag); if(cls)e.className=cls; if(txt!=null)e.textContent=txt; return e; }
function buildUI(){
  const css=el('style');
  css.textContent=`
#ev-bar{position:fixed;left:50%;top:58px;transform:translate(-50%,-140%);z-index:25;width:min(560px,94vw);padding:12px 14px;display:flex;gap:12px;align-items:center;
  background:#161a2b;border:2px solid #1a1c2c;box-shadow:inset 2px 2px 0 #21283f,inset -2px -2px 0 #0b0d16,0 0 0 2px #b13e53,0 6px 0 rgba(0,0,0,.35);transition:transform .35s steps(6),visibility 0s .35s;visibility:hidden}
#ev-bar.on{transform:translate(-50%,0);visibility:visible;transition:transform .35s steps(6)}
#ev-bar .ic{width:38px;height:38px;flex:none;display:flex;align-items:center;justify-content:center;font-size:24px;color:#ffcd75;background:#b13e53;border:2px solid #1a1c2c;animation:evBlink 1s steps(2) infinite}
@keyframes evBlink{50%{background:#5d275d}}
#ev-bar .tx{flex:1;min-width:0}
#ev-bar .al{font-size:11px;letter-spacing:.12em;color:#ef7d57}
#ev-bar .tt{font-size:18px;letter-spacing:.05em;color:#f4f4f4;margin:2px 0}
#ev-bar .dd{font-family:'Rubik',sans-serif;font-size:13px;line-height:1.35;color:#94b0c2}
#ev-bar .bt{display:flex;flex-direction:column;gap:6px;flex:none}
#ev-bar .bt .pbtn{font-size:13px;padding:6px 10px}
#ev-bar .tm{position:absolute;left:0;bottom:-2px;height:3px;background:#ef7d57;transform-origin:left}
#ev-hud{position:fixed;left:50%;bottom:12px;transform:translateX(-50%);z-index:24;display:none;flex-direction:column-reverse;align-items:center;gap:6px;pointer-events:none;width:min(560px,94vw)}
#ev-hud.on{display:flex}
#ev-hud.mini .hh{display:none}
#ev-hud .hh{font-family:'Rubik',sans-serif;font-size:14px;color:#f4f4f4;text-align:center;padding:6px 12px;background:rgba(13,14,23,.86);border:2px solid #1a1c2c;line-height:1.35}
#ev-hud .hs{font-size:14px;letter-spacing:.06em;color:#ffcd75;padding:4px 12px;background:rgba(13,14,23,.86);border:2px solid #1a1c2c;text-align:center;max-width:100%}
@media (max-width:520px){#ev-hud .hs{font-size:12px;letter-spacing:.02em;padding:3px 8px}#ev-hud .hh{font-size:13px;padding:5px 8px}}
#ev-hud .tb{width:100%;height:6px;background:#1a1c2c;border:2px solid #1a1c2c}
#ev-hud .tb i{display:block;height:100%;background:#a7f070;transform-origin:left}
#ev-res{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%) scale(.9);z-index:52;opacity:0;pointer-events:none;transition:opacity .2s,transform .2s steps(3);
  width:min(380px,90vw);padding:18px;text-align:center;display:flex;flex-direction:column;gap:10px;align-items:center}
#ev-res.on{opacity:1;transform:translate(-50%,-50%);pointer-events:auto}
#ev-res .rt{font-size:22px;letter-spacing:.08em}
#ev-res .rt.win{color:#a7f070}#ev-res .rt.mid{color:#ffcd75}#ev-res .rt.fail{color:#ef7d57}
#ev-res .rd{font-family:'Rubik',sans-serif;font-size:14px;color:#94b0c2}
#ev-res .rp{font-size:15px;color:#ffcd75}
#stage.ev-lock{overflow:hidden;touch-action:none}
#stage.ev-cup #cv{cursor:none}
#ev-toggle{margin:0 8px 8px;justify-content:center}
#ev-pts{font-family:'JetBrains Mono',monospace;font-size:11px;color:#ffcd75;padding:0 14px 8px;letter-spacing:.06em}
/* капча */
#cap{position:fixed;inset:0;z-index:51;display:none;align-items:center;justify-content:center;background:rgba(8,9,15,.7);padding:16px}
#cap.on{display:flex}
#capbox{width:330px;max-width:100%;background:#f4f4f4;color:#1a1c2c;border:2px solid #1a1c2c;box-shadow:0 0 0 2px #566c86,0 8px 0 rgba(0,0,0,.35);font-family:'Rubik',sans-serif}
#capbox .ch{background:#3b5dc9;color:#fff;padding:12px 14px}
#capbox .ch small{display:block;font-size:12px;opacity:.85}
#capbox .ch b{display:block;font-size:19px;font-weight:500;margin-top:2px}
#capgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;padding:8px}
#capgrid button{position:relative;aspect-ratio:1;background:#94b0c2;border:0;padding:0;cursor:var(--cur-p)}
#capgrid canvas{width:100%;height:100%;image-rendering:pixelated;display:block}
#capgrid button.on{outline:4px solid #3b5dc9;outline-offset:-4px}
#capgrid button.on::after{content:'✓';position:absolute;left:4px;top:2px;width:20px;height:20px;border-radius:50%;background:#3b5dc9;color:#fff;font-size:14px;line-height:20px}
#capbox .cf{display:flex;align-items:center;justify-content:space-between;padding:8px 10px 10px;gap:8px;border-top:1px solid #c5cfd8}
#capbox .cm{font-size:13px;color:#b13e53;min-height:16px}
#capbox.shake{animation:nope .3s steps(4)}
/* сцены */
#ev-scene{position:fixed;left:0;right:0;top:48px;bottom:0;z-index:15;display:none;overflow:hidden;opacity:0;transition:opacity .35s steps(5)}
#ev-scene.on{display:block}
#ev-scene.vis{opacity:1}
#ev-scene .sw{position:absolute}
#ev-scene canvas{display:block;width:100%;height:100%;image-rendering:pixelated;touch-action:none;cursor:var(--cur-p,pointer)}
#ev-scene .so{position:absolute;inset:0;pointer-events:none}
#ev-scene .so>*{pointer-events:auto}
#ev-scene .so>.bub{pointer-events:none}
`;
  document.head.appendChild(css);
  const bar=el('div','px'); bar.id='ev-bar';
  bar.innerHTML='<div class="ic">!</div><div class="tx"><div class="al"></div><div class="tt"></div><div class="dd"></div></div><div class="bt"><button class="pbtn go" type="button" data-a="help"></button><button class="pbtn" type="button" data-a="skip"></button></div><div class="tm"></div>';
  document.body.appendChild(bar); ui.bar=bar;
  bar.querySelector('[data-a=help]').addEventListener('click',accept);
  bar.querySelector('[data-a=skip]').addEventListener('click',()=>decline(true));
  const hud=el('div'); hud.id='ev-hud';
  hud.innerHTML='<div class="hh"></div><div class="hs"></div><div class="tb"><i></i></div>';
  document.body.appendChild(hud); ui.hud=hud;
  const res=el('div','px'); res.id='ev-res';
  res.innerHTML='<div class="rt"></div><div class="rd"></div><div class="rp"></div><button class="pbtn go" type="button"></button>';
  document.body.appendChild(res); ui.res=res;
  res.querySelector('button').addEventListener('click',closeResult);
  /* переключатель и очки в меню агентов */
  const dr=document.getElementById('drawer');
  if(dr){
    const pts=el('div'); pts.id='ev-pts'; dr.appendChild(pts); ui.pts=pts;
    const tg=el('button','pbtn'); tg.id='ev-toggle'; tg.type='button'; dr.appendChild(tg); ui.tg=tg;
    tg.addEventListener('click',e=>{ e.stopPropagation(); DB.on=!DB.on; save(); paintMenu(); if(!DB.on&&state==='offer')decline(false); if(DB.on)schedule(true); });
  }
  const cap=el('div'); cap.id='cap';
  cap.innerHTML='<div id="capbox"><div class="ch"><small></small><b></b></div><div id="capgrid"></div><div class="cf"><span class="cm"></span><button class="pbtn go" type="button"></button></div></div>';
  document.body.appendChild(cap); ui.cap=cap;
  paintMenu();
}
function paintMenu(){
  if(ui.tg)ui.tg.textContent=tx(DB.on?'toggle_on':'toggle_off');
  if(ui.pts)ui.pts.textContent=tx('points')+': '+DB.pts;
}

/* ---------- ход событий ---------- */
function canStart(){
  if(document.hidden)return false;
  if(document.querySelector('.modal.on'))return false;
  if(document.getElementById('drawer')&&document.getElementById('drawer').classList.contains('on'))return false;
  return true;
}
function offer(id){
  cur=EVENTS[id]; if(!cur){ schedule(false); return; }
  if(cur.ready&&!cur.ready()){ cur=null; schedule(false); return; }
  state='offer'; lastId=id;
  const b=ui.bar;
  b.querySelector('.al').textContent=tx('alarm');
  b.querySelector('.tt').textContent=tx(id+'_t');
  b.querySelector('.dd').textContent=tx(id+'_d');
  b.querySelector('[data-a=help]').textContent=tx('help');
  b.querySelector('[data-a=skip]').textContent=tx('skip');
  b.classList.add('on');
  offerUntil=now()+20000;
  if(cur.tease)cur.tease();
  O.track('office.ev.offer.'+id);
}
function accept(){
  if(state!=='offer')return;
  ui.bar.classList.remove('on');
  state='play'; playStart=now(); playEnd=playStart+cur.dur*1000;
  ui.hud.classList.add('on');
  const ft=document.getElementById('foot'); if(ft)ft.classList.add('hide');
  ui.hud.querySelector('.hh').textContent=tx(lastId+'_h');
  ui.hud.classList.remove('mini'); clearTimeout(ui.hhT); ui.hhT=setTimeout(()=>ui.hud.classList.add('mini'),8000);
  cur.start();
  O.track('office.ev.play.'+lastId);
}
function decline(byUser){
  if(state!=='offer')return;
  ui.bar.classList.remove('on');
  state='idle';
  const ev=cur; cur=null;
  if(ev&&ev.cleanup)ev.cleanup();
  /* пропустили: роботы ворчат */
  const a=crew(1)[0];
  if(a)setTimeout(()=>O.sayChain(a,TX[lastId+'_skip']?tx(lastId+'_skip'):tx('skip_generic'),true),byUser?500:0);
  lastEv={id:lastId,grade:'skip',t:now()};
  O.track('office.ev.skip.'+lastId);
  schedule(false);
}
function finish(grade,detail){
  if(state!=='play')return;
  state='result';
  ui.hud.classList.remove('on');
  const ev=cur;
  const pts=grade==='win'?30:grade==='mid'?15:5;
  lastEv={id:lastId,grade,t:now()};
  DB.pts+=pts; DB.done[lastId]=(DB.done[lastId]||0)+(grade==='win'?1:0); save(); paintMenu();
  const r=ui.res;
  r.querySelector('.rt').textContent=tx('res_'+grade); r.querySelector('.rt').className='rt '+grade;
  r.querySelector('.rd').textContent=detail||'';
  r.querySelector('.rp').textContent=tx('pts',{n:pts});
  r.querySelector('button').textContent=tx('ok');
  setTimeout(()=>{ if(state==='result')r.classList.add('on'); },650);
  /* итог сам закрывается через 12 с, чтобы следующее ЧП не ждало кнопку */
  const tok=++resTok; setTimeout(()=>{ if(state==='result'&&tok===resTok)closeResult(); },12650);
  if(ev.end)ev.end(grade);
  O.track('office.ev.'+grade+'.'+lastId);
}
function closeResult(){
  ui.res.classList.remove('on');
  sceneClose();
  if(cur&&cur.cleanup)cur.cleanup();
  cur=null; state='idle'; fx=[];
  stageLock(false);
  schedule(false);
}
function stageLock(on,cup){
  const st=O.stage();
  st.classList.toggle('ev-lock',!!on);
  st.classList.toggle('ev-cup',!!cup);
}

/* мини-игры; остальные (со сценами) в events2.js */
const EVENTS={};

/* --- 1. Кофейный кризис: носить кофе роботам с садящейся батарейкой --- */
EVENTS.coffee=(function(){
  let bots=[], cup=false, brew=0, saved=0;
  function pickNext(a){ if(state==='play'&&!a.ev.dead)wander(a,()=>{ a.face=a.ev.charge<30?'sad':'idle'; setTimeout(()=>pickNext(a),600+Math.random()*1800); }); }
  return {
    dur:45,
    ready(){ return crew().length>=3; },
    tease(){ crew(3).forEach((a,i)=>setTimeout(()=>O.sayChain(a,tx('coffee_say'),true),i*900)); },
    start(){
      bots=crew(8); cup=false; brew=0; saved=0;
      box=viewBox(SPOT.coffeeView.x,SPOT.coffeeView.y);
      O.focusOn(SPOT.coffeeView.x,SPOT.coffeeView.y,true);
      bots.forEach(a=>{ hold(a); a.ev={charge:55+Math.random()*40,drain:2.2+Math.random()*1.8,dead:false,over:0}; pickNext(a); });
      stageLock(true,false);
    },
    step(dt){
      if(brew>0){ brew-=dt; if(brew<=0){ cup=true; stageLock(true,true); } }
      bots.forEach(a=>{
        const e=a.ev; if(!e||e.dead)return;
        e.charge-=e.drain*dt;
        if(e.over>0){ e.over-=dt; if(Math.random()<dt*2)a.face=Math.random()<.5?'wow':'happy'; }
        if(e.charge<=0){ e.charge=0; e.dead=true; a.path=[]; a.sit=true; a.face='off'; O.say(a,tx('coffee_off'),true); }
        else if(e.charge<20&&Math.random()<dt*.15&&!a.bub)O.say(a,tx('coffee_say'));
      });
    },
    click(p){
      if(inRect(p,SPOT.coffee)){ if(!cup&&brew<=0){ brew=.6; burst(SPOT.coffee.cx,SPOT.coffee.cy-6,'#94b0c2',6); } return true; }
      const h=O.hit(p);
      if(h&&h.ev&&cup){
        const e=h.ev; cup=false; stageLock(true,false);
        const wasDead=e.dead;
        if(e.charge>70){ e.over=6; O.say(h,tx('coffee_over'),true); }
        else O.say(h,tx('coffee_thx'),true);
        e.charge=Math.min(100,e.charge+65);
        if(wasDead){ e.dead=false; h.sit=false; h.face='happy'; pickNext(h); }
        else h.face='happy';
        burst(h.x,h.y-26,'#ffcd75',10);
        return true;
      }
      return true;
    },
    draw(ctx){
      /* подсветка кофемашины */
      const t=now();
      if(!cup&&brew<=0&&(t/400|0)%2){ ctx.strokeStyle='#ffcd75'; ctx.lineWidth=1; ctx.strokeRect(SPOT.coffee.x+.5,SPOT.coffee.y+.5,SPOT.coffee.w-1,SPOT.coffee.h-1); }
      if(brew>0){ ctx.fillStyle='#f4f4f4'; for(let i=0;i<3;i++)ctx.fillRect(SPOT.coffee.cx-4+i*4,SPOT.coffee.y+2-((t/120+i*3)%8),1,2); }
      bots.forEach(a=>{
        const e=a.ev; if(!e)return;
        const x=Math.round(a.x-7), y=Math.round(a.y-(a.sit?32:35));
        ctx.fillStyle='#1a1c2c'; ctx.fillRect(x,y,14,4);
        const w=Math.round(12*e.charge/100);
        ctx.fillStyle=e.charge>50?'#38b764':e.charge>20?'#ffcd75':((t/200|0)%2?'#b13e53':'#5d275d');
        ctx.fillRect(x+1,y+1,w,2);
        if(e.over>0){ ctx.fillStyle='#73eff7'; ctx.fillRect(x+Math.round(Math.random()*12),y-2,1,1); }
      });
      if(cup&&pointer.in&&!prop(ctx,'cup',pointer.x+2,pointer.y-6,0,.75))pix(ctx,CUP,Math.round(pointer.x-4),Math.round(pointer.y-4));
    },
    tick(){
      const alive=bots.filter(a=>!a.ev.dead).length;
      return tx('h_coffee',{c:tx(cup?'yes':'no'),a:alive,n:bots.length});
    },
    timeout(){
      const alive=bots.filter(a=>!a.ev.dead).length, k=alive/bots.length;
      finish(k>=.99?'win':k>=.6?'mid':'fail',alive+' / '+bots.length);
    },
    end(grade){
      bots.forEach((a,i)=>{ if(a.ev.dead){ a.sit=false; a.face='idle'; } setTimeout(()=>{ if(i<2)O.sayChain(a,grade==='fail'?tx('coffee_skip'):tx('coffee_thx'),true); },i*700); });
    },
    cleanup(){ bots.forEach(a=>{ delete a.ev; a.sit=false; O.release(a); }); bots=[]; cup=false; box=null; }
  };
})();

/* --- 2. Баг сбежал: поймать жука, пока он не добежал до терминала --- */
EVENTS.bug=(function(){
  let bug=null, chasers=[], hits=0, chaseT=0;
  return {
    dur:30,
    tease(){ const a=crew(1)[0]; if(a)O.sayChain(a,tx('bug_say'),true); },
    start(){
      const s=O.pick(SPOT.bugStart);
      bug={x:s.x,y:s.y,vx:0,vy:0,spd:27,ang:Math.random()*6.28,flip:false,stun:0,hop:0};
      hits=0; chaseT=0;
      chasers=crew(4); chasers.forEach(hold);
      O.focusOn(bug.x,bug.y,false);
      stageLock(true,false);
    },
    step(dt){
      if(!bug)return;
      follow(bug.x,bug.y,dt);
      if(bug.stun>0){ bug.stun-=dt; return; }
      const tx_=SPOT.server.cx-bug.x, ty_=SPOT.server.cy-bug.y, d=Math.hypot(tx_,ty_);
      /* бежит к терминалу, но виляет */
      const want=Math.atan2(ty_,tx_)+Math.sin(now()/400)*1.1+(Math.random()-.5)*.6;
      bug.ang+=Math.atan2(Math.sin(want-bug.ang),Math.cos(want-bug.ang))*Math.min(1,dt*3);
      const sp=bug.spd*(1+hits*.3);
      bug.x+=Math.cos(bug.ang)*sp*dt; bug.y+=Math.sin(bug.ang)*sp*dt;
      bug.x=Math.max(6,Math.min(O.W-6,bug.x)); bug.y=Math.max(SPOT.yMin,Math.min(SPOT.yMax,bug.y));
      bug.flip=Math.cos(bug.ang)<0;
      if(d<12){ finish('fail',''); return; }
      /* роботы бестолково гоняются */
      chaseT-=dt;
      if(chaseT<=0){ chaseT=1.6;
        chasers.forEach((a,i)=>{ if(Math.random()<.6){ O.goTo(a,nearSpot(bug.x+(Math.random()-.5)*50,bug.y+(Math.random()-.5)*30,'ev-ch'+i)); }
          if(Math.random()<.25&&!a.bub)O.say(a,tx('bug_say')); });
      }
    },
    click(p){
      if(bug&&Math.hypot(p.x-bug.x,p.y-bug.y)<12){
        hits++; burst(bug.x,bug.y,'#a7f070',12);
        if(hits>=3){ const b=bug; bug=null; burst(b.x,b.y,'#ffcd75',20); finish(hits>=3?'win':'mid',''); return true; }
        /* отскакивает в сторону и ускоряется */
        bug.ang+=Math.PI*(.6+Math.random()*.8); bug.x+=Math.cos(bug.ang)*18; bug.y+=Math.sin(bug.ang)*12; bug.stun=.25;
        return true;
      }
      return true;
    },
    draw(ctx){
      const t=now();
      /* цель бага: мигающая рамка вокруг терминала */
      if((t/300|0)%2){ ctx.strokeStyle='#b13e53'; ctx.lineWidth=1; ctx.strokeRect(SPOT.server.x+.5,SPOT.server.y+.5,SPOT.server.w-1,SPOT.server.h-1); }
      if(!bug)return;
      /* жук смотрит туда, куда бежит; поворот только на 90 градусов, чтобы пиксели не плыли */
      const q=Math.round((bug.ang+Math.PI/2)/(Math.PI/2))*(Math.PI/2);
      if(!prop(ctx,(t/110|0)%2?'bug2':'bug',bug.x,bug.y,q))pix(ctx,BUG[(t/110|0)%2],Math.round(bug.x-5),Math.round(bug.y-7),bug.flip);
      for(let i=0;i<3-hits;i++)pix(ctx,HEART,Math.round(bug.x-11+i*8),Math.round(bug.y-19));
      /* баг за краем кадра: стрелка у края показывает, где он */
      edgeArrow(ctx,bug.x,bug.y,'#a7f070');
    },
    tick(){ return tx('h_bug',{n:hits}); },
    timeout(){ finish(hits>0?'mid':'fail',''); },
    end(grade){ const a=chasers[0]; if(a)setTimeout(()=>O.sayChain(a,tx(grade==='win'?'bug_win':'bug_fail'),true),400); },
    cleanup(){ chasers.forEach(O.release); chasers=[]; bug=null; }
  };
})();

/* --- 3. Кот на клавиатуре: увести кота лазерной точкой на диван --- */
EVENTS.cat=(function(){
  let cat=null, desk=null, owner=null, home=false, sayT=0;
  return {
    dur:35,
    ready(){ return !!O.pets.find(p=>p.kind==='cat'); },
    tease(){
      cat=O.pets.find(p=>p.kind==='cat'); owner=O.byId.anton||O.agents[0];
      desk=O.deskOf(owner.def.seat);
      cat.held=true; cat.path=[]; cat.x=desk.x; cat.y=desk.y;
      O.sayChain(owner,tx('cat_say'),true);
    },
    start(){
      home=false; sayT=2;
      O.focusOn(cat.x+60,cat.y,true);
      stageLock(true,true);
    },
    step(dt){
      if(!cat||home)return;
      follow(cat.x,cat.y,dt);
      sayT-=dt;
      if(sayT<=0){ sayT=4+Math.random()*3; if(!owner.bub)O.say(owner,tx('cat_say')); }
      if(pointer.in){
        const dx=pointer.x-cat.x, dy=pointer.y-cat.y, d=Math.hypot(dx,dy);
        /* кот бежит к точке, если она недалеко; если далеко, ленится */
        if(d>3&&d<110){ const sp=(d<30?34:24)*dt; cat.x+=dx/d*Math.min(sp,d); cat.y+=dy/d*Math.min(sp,d); cat.flip=dx>0; cat.y=Math.max(SPOT.yMin+6,Math.min(SPOT.yMax,cat.y)); }
      }
      if(inRect({x:cat.x,y:cat.y},SPOT.sofa)){ home=true; cat.x=SPOT.sofa.cx; cat.y=SPOT.sofa.cy; burst(cat.x,cat.y-10,'#f4f4f4',12); O.say(cat,O.sayPool('say.cat'),true); finish('win',''); }
    },
    click(){ return true; },
    draw(ctx){
      const t=now();
      if(!home&&(t/400|0)%2){ ctx.strokeStyle='#a7f070'; ctx.lineWidth=1; ctx.strokeRect(SPOT.sofa.x+.5,SPOT.sofa.y+.5,SPOT.sofa.w-1,SPOT.sofa.h-1); }
      if(!home)edgeArrow(ctx,SPOT.sofa.cx,SPOT.sofa.cy,'#a7f070');
      if(pointer.in&&!home){ ctx.fillStyle='#b13e53'; ctx.fillRect(Math.round(pointer.x)-1,Math.round(pointer.y)-1,3,3); ctx.fillStyle='#ffcd75'; ctx.fillRect(Math.round(pointer.x),Math.round(pointer.y),1,1); }
    },
    tick(){ return tx('h_cat'); },
    timeout(){ finish('fail',''); },
    end(grade){ setTimeout(()=>O.sayChain(owner,tx(grade==='win'?'cat_win':'cat_fail'),true),500); },
    cleanup(){ if(cat){ cat.held=false; cat.next=performance.now()+20000; } cat=null; }
  };
})();

/* --- 4. Капча: доказать сайту, что роботы не роботы --- */
EVENTS.cap=(function(){
  /* значки: предметы из листа Codex, робот и кот из офиса, светофор кодом; у каждого признаки для вопросов */
  const ICONS={
    light:{eyes:false,robot:false,rows:["....oooo....","...oddddo...","...odrrdo...","...odrrdo...","...oddddo...","...odyydo...","...odyydo...","...oddddo...","...odggdo...","...odggdo...","....oooo....",".....oo....."]},
    robot:{eyes:true,robot:true},
    robot2:{eyes:true,robot:true},
    cat:{eyes:true,robot:false,img:'cat'},
    cup:{eyes:false,robot:false,prop:'cup',rows:CUP},
    duck:{eyes:false,robot:false,prop:'duck'},
    bug:{eyes:false,robot:false,prop:'bug',rows:BUG[0]},
    router:{eyes:false,robot:false,prop:'router'},
    ext:{eyes:false,robot:false,prop:'ext'},
    floppy:{eyes:false,robot:false,prop:'floppy'},
    pizza:{eyes:false,robot:false,prop:'pizza'},
    wrench:{eyes:false,robot:false,prop:'wrench'}
  };
  const ROUNDS=[
    {q:'cap_q1',ok:k=>k==='light'},
    {q:'cap_q2',ok:k=>!ICONS[k].robot},
    {q:'cap_q3',ok:k=>ICONS[k].eyes}
  ];
  let round=0, tiles=[], gate=[], errors=0;
  const BG=['#94b0c2','#c3d2dc','#e4ecf2','#b9c6d6','#d6dfe8','#a9bccb'];
  function icon(k,i){
    const c=document.createElement('canvas'); c.width=32; c.height=32;
    const x=c.getContext('2d'); x.imageSmoothingEnabled=false;
    x.fillStyle=BG[i%BG.length]; x.fillRect(0,0,32,32);
    const d=ICONS[k];
    if(d.robot){ const ag=O.agents[(i*5+round)%O.agents.length]; x.drawImage(O.sprite(ag.pal,'idle','down',0,false,false,false),8,4); }
    else if(d.img&&O.imgs[d.img]){ const im=O.imgs[d.img]; x.drawImage(im,Math.round(16-im.width/2),Math.round(16-im.height/2)); }
    else if(d.prop&&prop(x,d.prop,16,16)){}
    else if(d.rows){ x.save(); x.scale(2,2); pix(x,d.rows,Math.round(8-d.rows[0].length/2),Math.round(8-d.rows.length/2)); x.restore(); }
    return c;
  }
  function deal(){
    const keys=Object.keys(ICONS), r=ROUNDS[round];
    /* в каждом раунде хотя бы 2 верных и 2 неверных */
    for(let t=0;t<50;t++){
      tiles=[]; for(let i=0;i<9;i++)tiles.push(O.pick(keys));
      const n=tiles.filter(r.ok).length; if(n>=2&&n<=6)break;
    }
    const g=document.getElementById('capgrid'); g.innerHTML='';
    tiles.forEach((k,i)=>{ const b=document.createElement('button'); b.type='button'; b.appendChild(icon(k,i));
      b.addEventListener('click',()=>b.classList.toggle('on')); g.appendChild(b); });
    const box=document.getElementById('capbox');
    box.querySelector('.ch small').textContent=tx('cap_round',{n:round+1});
    box.querySelector('.ch b').textContent=tx(r.q);
    box.querySelector('.cm').textContent='';
  }
  function check(){
    if(state!=='play')return;
    const r=ROUNDS[round], sel=[...document.querySelectorAll('#capgrid button')].map(b=>b.classList.contains('on'));
    const ok=tiles.every((k,i)=>r.ok(k)===sel[i]);
    const box=document.getElementById('capbox');
    if(!ok){ errors++; box.classList.remove('shake'); void box.offsetWidth; box.classList.add('shake'); deal(); box.querySelector('.cm').textContent=tx('cap_bad'); return; }
    round++;
    if(round>=ROUNDS.length){ ui.cap.classList.remove('on'); finish(errors===0?'win':'mid',''); return; }
    deal();
  }
  return {
    dur:60,
    tease(){ const a=O.byId.node&&!O.busyMode(O.byId.node)?O.byId.node:crew(1)[0]; if(a)O.sayChain(a,tx('cap_say'),true); },
    start(){
      round=0; errors=0;
      gate=crew(4); gate.forEach((a,i)=>{ hold(a); O.goTo(a,O.topT(SPOT.door.cx-24+i*16,SPOT.door.cy+8,'up','ev-gate'+i),()=>{ a.face='sad'; }); });
      O.focusOn(SPOT.door.cx,120,true);
      const box=document.getElementById('capbox');
      box.querySelector('.cf button').textContent=tx('cap_ok');
      box.querySelector('.cf button').onclick=check;
      deal();
      setTimeout(()=>{ if(state==='play'&&cur===EVENTS.cap)ui.cap.classList.add('on'); },900);
      gate.forEach((a,i)=>setTimeout(()=>{ if(state==='play')O.say(a,tx('cap_say')); },1500+i*1300));
    },
    step(){},
    click(){ return false; },
    draw(){},
    tick(){ return tx('h_cap',{n:round}); },
    timeout(){ ui.cap.classList.remove('on'); finish(round>=2?'mid':'fail',''); },
    end(grade){ gate.forEach((a,i)=>{ a.face=grade==='fail'?'sad':'happy'; if(i<2)setTimeout(()=>O.sayChain(a,tx(grade==='fail'?'cap_fail':'cap_win'),true),500+i*900); }); },
    cleanup(){ ui.cap.classList.remove('on'); gate.forEach(O.release); gate=[]; }
  };
})();

/* ---------- сцены: для некоторых ЧП картинка офиса меняется на отдельную сцену 480x270 ----------
   Масштаб целый. Сцена закрывает экран, но на узком экране не уже 230 родных пикселей:
   иначе на телефоне видна только середина шириной 130 px. Сверху и снизу тогда поля цвета краёв картинки. */
const SCN={on:false,s:1,imgs:{},vx:0,vw:480,vy:0,vh:270,bubs:[]};
let spointer={x:-99,y:-99,in:false}, sfx=[];
function sceneBuild(){
  const w=el('div'); w.id='ev-scene';
  w.innerHTML='<div class="sw"><canvas width="480" height="270"></canvas><div class="so"></div></div>';
  document.body.appendChild(w);
  SCN.el=w; SCN.sw=w.querySelector('.sw'); SCN.cv=w.querySelector('canvas'); SCN.ctx=SCN.cv.getContext('2d'); SCN.ov=w.querySelector('.so');
  SCN.ctx.imageSmoothingEnabled=false;
  const P=e=>{ const r=SCN.cv.getBoundingClientRect(); return {x:(e.clientX-r.left)/r.width*480,y:(e.clientY-r.top)/r.height*270,in:true}; };
  SCN.cv.addEventListener('pointerdown',e=>{ spointer=P(e); if(state==='play'&&cur&&cur.sclick)cur.sclick(spointer); });
  SCN.cv.addEventListener('pointermove',e=>{ spointer=P(e); if(state==='play'&&cur&&cur.smove)cur.smove(spointer); });
  SCN.cv.addEventListener('pointerleave',e=>{ if(e.pointerType==='mouse')spointer.in=false; });
  addEventListener('resize',()=>{ if(SCN.on)sceneFit(); });
}
function sceneFit(){
  const aw=SCN.el.clientWidth, ah=SCN.el.clientHeight, dpr=devicePixelRatio||1;
  const kc=Math.ceil(Math.max(aw*dpr/480,ah*dpr/270)-0.02), kf=Math.max(1,Math.floor(aw*dpr/230));
  const k=Math.max(1,Math.min(kc,kf)), sc=k/dpr;
  SCN.s=sc;
  /* по вертикали в центр экрана ставится точка fy сцены (у каждой своя), но без пустых полос */
  const fy=SCN.fy||135, top=270*sc>ah?Math.max(ah-270*sc,Math.min(0,ah/2-fy*sc)):(ah-270*sc)/2;
  Object.assign(SCN.sw.style,{width:480*sc+'px',height:270*sc+'px',left:'50%',top:top+'px',marginLeft:-240*sc+'px',marginTop:'0'});
  SCN.ov.style.setProperty('--s',sc+'px');
  SCN.ov.style.setProperty('--bf',Math.max(13,Math.min(19,Math.round(sc*3.4)))+'px');
  SCN.vw=Math.min(480,aw/sc); SCN.vx=240-SCN.vw/2; SCN.vh=Math.min(270,ah/sc); SCN.vy=Math.max(0,-top/sc);
}
/* цвет верхнего и нижнего края картинки: им закрашиваются поля */
function edgeCols(img){
  const c=document.createElement('canvas'); c.width=480; c.height=270; const x=c.getContext('2d'); x.drawImage(img,0,0);
  const g=y=>{ const d=x.getImageData(240,y,1,1).data; return 'rgb('+d[0]+','+d[1]+','+d[2]+')'; };
  return [g(1),g(268)];
}
function sceneOpen(name,ready,fy){
  SCN.fy=fy||135;
  if(!SCN.el)sceneBuild();
  const go=img=>{
    SCN.img=img; SCN.name=name; SCN.on=true; sfx=[];
    if(!img.__edge)img.__edge=edgeCols(img);
    SCN.el.style.background='linear-gradient('+img.__edge[0]+' 50%,'+img.__edge[1]+' 50%)';
    SCN.el.classList.add('on'); sceneFit();
    requestAnimationFrame(()=>SCN.el.classList.add('vis'));
    if(ready)ready();
    requestAnimationFrame(sceneLoop);
  };
  const im=SCN.imgs[name];
  if(im&&im.complete)go(im);
  else { const i=new Image(); i.onload=()=>go(i); i.onerror=()=>{ if(ready)ready(); }; i.src='img/office/scene_'+name+'.png?v=1'; SCN.imgs[name]=i; }
}
function sceneClose(){
  if(!SCN.on)return;
  SCN.on=false; SCN.el.classList.remove('vis');
  setTimeout(()=>{ if(!SCN.on){ SCN.el.classList.remove('on'); SCN.ov.innerHTML=''; SCN.bubs=[]; } },360);
}
let sLast=0;
function sceneLoop(t){
  if(!SCN.on)return;
  const dt=Math.min(.05,(t-(sLast||t))/1000); sLast=t;
  const c=SCN.ctx; c.imageSmoothingEnabled=false;
  c.drawImage(SCN.img,0,0);
  if(cur&&cur.sdraw)cur.sdraw(c,now(),dt);
  for(let i=sfx.length-1;i>=0;i--){ const f=sfx[i]; f.t+=dt; f.vy+=(f.g==null?120:f.g)*dt; f.x+=f.vx*dt; f.y+=f.vy*dt; if(f.t>f.life){ sfx.splice(i,1); continue; }
    c.globalAlpha=Math.max(0,1-f.t/f.life); c.fillStyle=f.col; c.fillRect(Math.round(f.x),Math.round(f.y),f.sz||1,f.sz||1); }
  c.globalAlpha=1;
  const nw=performance.now();
  SCN.bubs=SCN.bubs.filter(b=>{ if(nw>b.until){ b.el.remove(); return false; } return true; });
  requestAnimationFrame(sceneLoop);
}
function sburst(x,y,col,n,sz,g){ for(let i=0;i<(n||10);i++)sfx.push({x,y,vx:(Math.random()-.5)*80,vy:-Math.random()*70-10,t:0,life:.6+Math.random()*.5,col:col||'#ffcd75',sz:sz||2,g}); }
/* реплика в сцене: x, y в пикселях сцены, хвост пузыря указывает в эту точку */
function sceneSay(x,y,text,cls){
  if(!SCN.on||!text)return;
  const parts=String(text).split('|');
  let delay=0;
  parts.forEach(p=>{
    setTimeout(()=>{
      if(!SCN.on)return;
      SCN.bubs.filter(b=>Math.abs(b.x-x)<40&&Math.abs(b.y-y)<30).forEach(b=>b.until=0);
      const b=el('div','bub '+(cls||'f-extra'),p);
      const m=Math.min(70,SCN.vw/3);
      const cx=Math.max(SCN.vx+m,Math.min(SCN.vx+SCN.vw-m,x));
      b.style.left=cx*SCN.s+'px'; b.style.top=y*SCN.s+'px'; b.style.pointerEvents='none';
      SCN.ov.appendChild(b);
      SCN.bubs.push({el:b,x,y,until:performance.now()+1800+p.length*55});
    },delay);
    delay+=1800+p.length*55;
  });
}
/* робот в сцене крупно: ноги в точке (x, y), масштаб целый */
function sceneBot(c,a,x,y,sc,face,dir,frame){
  const spr=O.sprite(a.pal,face||'idle',dir||'down',frame||0,false,false,false);
  c.drawImage(spr,Math.round(x-8*sc),Math.round(y-24*sc),16*sc,24*sc);
}
function fontCls(a){ return 'f-'+(a.extra?'extra':a.id); }
/* цифры 3x5 для табло и часов */
const DIG={'0':'111101101101111','1':'010110010010111','2':'111001111100111','3':'111001111001111','4':'101101111001001','5':'111100111001111','6':'111100111101111','7':'111001010010010','8':'111101111101111','9':'111101111001111',':':'000010000010000','%':'101001010100101','°':'111101111000000','-':'000000111000000','!':'010010010000010'};
function digits(c,str,x,y,sc,col){
  c.fillStyle=col; let cx=x;
  for(const ch of String(str)){ const g=DIG[ch]; if(g){ for(let i=0;i<15;i++)if(g[i]==='1')c.fillRect(cx+(i%3)*sc,y+((i/3)|0)*sc,sc,sc); } cx+=(ch===':'?3:4)*sc; }
  return cx-x;
}
function digitsW(str,sc){ let w=0; for(const ch of String(str))w+=(ch===':'?3:4)*sc; return w-sc; }

/* ---------- связь с движком офиса ---------- */
let lastTick='';
O.register({
  grabs(){ return state==='play'&&cur&&cur!==EVENTS.cap&&!cur.scene; },
  move(p){ pointer.x=p.x; pointer.y=p.y; pointer.in=true; return state==='play'; },
  click(p){ if(state!=='play'||!cur)return false; return cur.click?cur.click(p):true; },
  step(dt,t){
    if(state==='idle'){
      if((DB.on||forcedNext)&&t>nextAt){
        if(canStart()){ const ids=Object.keys(EVENTS).filter(k=>k!==lastId); offer(forcedNext||O.pick(ids)); forcedNext=null; }
        else nextAt=t+5000;
      }
      return;
    }
    if(state==='offer'){
      const left=Math.max(0,(offerUntil-t)/20000);
      ui.bar.querySelector('.tm').style.width=(left*100)+'%';
      if(t>offerUntil)decline(false);
      return;
    }
    if(state==='play'&&cur){
      cur.step(dt);
      const rest=Math.max(0,playEnd-t);
      ui.hud.querySelector('.tb i').style.transform='scaleX('+(rest/(cur.dur*1000)).toFixed(3)+')';
      const s=cur.tick()+'   ·   '+tx('left',{n:Math.ceil(rest/1000)});
      if(s!==lastTick){ lastTick=s; ui.hud.querySelector('.hs').textContent=s; }
      if(rest<=0&&state==='play')cur.timeout();
    }
    for(let i=fx.length-1;i>=0;i--){ const f=fx[i]; f.t+=dt; f.vy+=120*dt; f.x+=f.vx*dt; f.y+=f.vy*dt; if(f.t>f.life)fx.splice(i,1); }
  },
  draw(ctx){
    if(cur&&cur.draw&&(state==='play'||state==='offer'||state==='result'))cur.draw(ctx);
    fx.forEach(f=>{ ctx.globalAlpha=Math.max(0,1-f.t/f.life); ctx.fillStyle=f.col; ctx.fillRect(Math.round(f.x),Math.round(f.y),1,1); });
    ctx.globalAlpha=1;
  }
});
/* касания на телефоне: точка лазера и курсор с чашкой идут за пальцем */
O.cv.addEventListener('pointermove',e=>{ if(state!=='play')return; const r=O.cv.getBoundingClientRect(); pointer.x=(e.clientX-r.left)/r.width*O.W; pointer.y=(e.clientY-r.top)/r.height*O.H; pointer.in=true; });
O.cv.addEventListener('pointerdown',e=>{ if(state!=='play')return; const r=O.cv.getBoundingClientRect(); pointer.x=(e.clientX-r.left)/r.width*O.W; pointer.y=(e.clientY-r.top)/r.height*O.H; pointer.in=true; });
O.cv.addEventListener('pointerleave',()=>{ if(!isTouch())pointer.in=false; });
function isTouch(){ return matchMedia('(pointer:coarse)').matches; }
addEventListener('keydown',e=>{ if(e.key==='Escape'&&state==='result')closeResult(); });

buildUI();
schedule(true);
if(forced){ forcedNext=forced; nextAt=now()+3000; }
window.OfficeEvents={kit:{O,TX,tx,EVENTS,ui,finish,crew,hold,PAL,pix,prop,burst,follow,viewBox,nearSpot,corridorSpot,wander,inRect,edgeArrow,now,stageLock,
    setBox:b=>{ box=b; }, pointer:()=>pointer, spointer:()=>spointer, state:()=>state, cur:()=>cur,
    scene:{open:sceneOpen,close:sceneClose,say:sceneSay,bot:sceneBot,burst:sburst,fontCls,view:()=>SCN,el:()=>SCN.ov}, digits, digitsW},
  last:()=>lastEv,
  start:id=>{ if(state==='idle'&&EVENTS[id]){ offer(id); } },accept:()=>accept(),state:()=>state,db:DB,refresh:paintMenu};
/* смена языка: подписи меню */
if(window.I18n&&I18n.onChange)I18n.onChange(paintMenu);
})();
