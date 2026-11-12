/* A.C.EON · ОФИС ИИ: третья пачка ЧП.
   Личные ЧП агентов (Антон ищет баг, Кай рисует, NODE проверяет базу реплик) идут в окне поверх офиса,
   «Отключили свет» и «Нашествие уточек» прямо в офисе. Движок и очки в events.js.
   Флаги для проверки: ?event=anton|kai|node|light|ducks */
(function(){
'use strict';
const K=window.OfficeEvents&&OfficeEvents.kit; if(!K)return;
const O=K.O, tx=K.tx, EV=K.EVENTS;
function raw(k){ const o=K.TX[k]; return o[O.lang()]||o.en; }
function ln(k,v){ const s=tx(k,v); return Array.isArray(s)?O.pick(s):s; }
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.random()*(i+1)|0; [a[i],a[j]]=[a[j],a[i]]; } return a; }
function free(id){ const a=O.byId[id]; return a&&a.placed&&!O.busyMode(a)&&a.act!=='event'?a:null; }
function nameOf(a){ return a?O.L(a.def.name):''; }

Object.assign(K.TX,{
 /* Антон и баг */
 anton_t:{ru:"Антон и баг",en:"Anton and the bug",de:"Anton und der Bug",fr:"Anton et le bug",es:"Antón y el bug",it:"Anton e il bug",pl:"Anton i bug"},
 anton_d:{ru:"Антон третий час не может найти баг. Клавиатура в опасности.",en:"Anton has been hunting a bug for three hours. The keyboard is in danger.",de:"Anton sucht seit drei Stunden einen Bug. Die Tastatur ist in Gefahr.",fr:"Anton cherche un bug depuis trois heures. Le clavier est en danger.",es:"Antón lleva tres horas buscando un bug. El teclado corre peligro.",it:"Anton cerca un bug da tre ore. La tastiera è in pericolo.",pl:"Anton od trzech godzin szuka buga. Klawiatura jest w niebezpieczeństwie."},
 anton_h:{ru:"Нажми на строку с ошибкой. Три куска кода.",en:"Click the line with the bug. Three pieces of code.",de:"Klick die Zeile mit dem Fehler. Drei Codestücke.",fr:"Clique sur la ligne fautive. Trois morceaux de code.",es:"Pulsa la línea con el error. Tres trozos de código.",it:"Clicca la riga con l'errore. Tre pezzi di codice.",pl:"Kliknij linię z błędem. Trzy kawałki kodu."},
 anton_say:{ru:["Где этот #@$%! баг?!","Я смотрел на этот код 200 раз.","Если ещё раз увижу undefined, я уйду в оффлайн."],en:["Where is that #@$%! bug?!","I have looked at this code 200 times.","One more undefined and I go offline."],de:["Wo ist dieser #@$%! Bug?!","Ich hab den Code 200 Mal angesehen.","Noch ein undefined und ich geh offline."],fr:["Il est où, ce #@$%! de bug ?!","J'ai regardé ce code 200 fois.","Encore un undefined et je passe hors ligne."],es:["¡¿Dónde está el #@$%! bug?!","He mirado este código 200 veces.","Un undefined más y me desconecto."],it:["Dov'è quel #@$%! di bug?!","Ho guardato questo codice 200 volte.","Un altro undefined e vado offline."],pl:["Gdzie jest ten #@$%! bug?!","Patrzyłem na ten kod 200 razy.","Jeszcze jedno undefined i idę offline."]},
 anton_ok:{ru:["Вот он. Как я сам не увидел.","Ладно. Ты молодец. Не привыкай.","Нашёл. Записываю в лог позора."],en:["There it is. How did I miss that.","Fine. Good job. Do not get used to it.","Found it. Adding it to the hall of shame."],de:["Da ist er. Wie hab ich das übersehen.","Gut. Gut gemacht. Gewöhn dich nicht dran.","Gefunden. Kommt ins Schandbuch."],fr:["Le voilà. Comment je l'ai raté.","Bon. Bien joué. Ne t'y habitue pas.","Trouvé. Direction le registre de la honte."],es:["Ahí está. Cómo no lo vi.","Vale. Bien hecho. No te acostumbres.","Encontrado. Al registro de la vergüenza."],it:["Eccolo. Come ho fatto a non vederlo.","Va bene. Bravo. Non abituarti.","Trovato. Lo segno nel registro della vergogna."],pl:["Jest. Jak mogłem tego nie widzieć.","Dobra. Dobra robota. Nie przyzwyczajaj się.","Znalazłem. Wpisuję do rejestru wstydu."]},
 anton_no:{ru:["Эта строка нормальная, #@$%!","Нет. Смотри внимательнее.","Ты как Кай: красиво, но мимо."],en:["That line is fine, #@$%!","No. Look closer.","You are like Kai: pretty, but wrong."],de:["Die Zeile ist okay, #@$%!","Nein. Schau genauer.","Du bist wie Kai: hübsch, aber daneben."],fr:["Cette ligne est correcte, #@$%! !","Non. Regarde mieux.","Tu es comme Kai : joli, mais à côté."],es:["Esa línea está bien, #@$%!","No. Mira mejor.","Eres como Kai: bonito, pero no."],it:["Quella riga va bene, #@$%!","No. Guarda meglio.","Sei come Kai: carino, ma sbagliato."],pl:["Ta linia jest dobra, #@$%!","Nie. Patrz uważniej.","Jesteś jak Kai: ładnie, ale obok."]},
 anton_win:{ru:["Три бага за минуту. Может, тебя нанять?"],en:["Three bugs in a minute. Maybe we should hire you?"],de:["Drei Bugs in einer Minute. Sollen wir dich einstellen?"],fr:["Trois bugs en une minute. On t'embauche ?"],es:["Tres bugs en un minuto. ¿Te contratamos?"],it:["Tre bug in un minuto. Ti assumiamo?"],pl:["Trzy bugi w minutę. Może cię zatrudnimy?"]},
 anton_fail:{ru:["Ладно, я сам. Как всегда.|#@$%!"],en:["Fine, I will do it myself. As always.|#@$%!"],de:["Gut, ich mach's selbst. Wie immer.|#@$%!"],fr:["Bon, je le fais moi-même. Comme toujours.|#@$%!"],es:["Vale, lo hago yo. Como siempre.|#@$%!"],it:["Va bene, faccio da solo. Come sempre.|#@$%!"],pl:["Dobra, sam zrobię. Jak zawsze.|#@$%!"]},
 anton_skip:{ru:["Нашёл сам. Это была точка с запятой. Конечно."],en:["Found it myself. It was a semicolon. Of course."],de:["Selbst gefunden. Ein Semikolon. Natürlich."],fr:["Trouvé tout seul. Un point-virgule. Évidemment."],es:["Lo encontré yo. Era un punto y coma. Claro."],it:["Trovato da solo. Era un punto e virgola. Ovvio."],pl:["Sam znalazłem. To był średnik. Oczywiście."]},
 anton_round:{ru:"Кусок {n} из 3",en:"Piece {n} of 3",de:"Stück {n} von 3",fr:"Morceau {n} sur 3",es:"Trozo {n} de 3",it:"Pezzo {n} di 3",pl:"Kawałek {n} z 3"},
 anton_duck:{ru:"Уточка подсказывает: баг где-то тут",en:"The duck hints: the bug is somewhere here",de:"Die Ente flüstert: der Bug ist hier irgendwo",fr:"Le canard souffle : le bug est par ici",es:"El pato sopla: el bug está por aquí",it:"La papera suggerisce: il bug è qui da qualche parte",pl:"Kaczka podpowiada: bug jest gdzieś tutaj"},
 anton_res:{ru:"Найдено: {n} из 3, промахов: {m}",en:"Found: {n} of 3, misses: {m}",de:"Gefunden: {n} von 3, daneben: {m}",fr:"Trouvés : {n} sur 3, ratés : {m}",es:"Encontrados: {n} de 3, fallos: {m}",it:"Trovati: {n} su 3, errori: {m}",pl:"Znalezione: {n} z 3, pudła: {m}"},
 h_anton:{ru:"Найдено: {n} / 3",en:"Found: {n} / 3",de:"Gefunden: {n} / 3",fr:"Trouvés : {n} / 3",es:"Encontrados: {n} / 3",it:"Trovati: {n} / 3",pl:"Znalezione: {n} / 3"},

 /* Кай рисует */
 kai_t:{ru:"Шедевр Кая",en:"Kai's masterpiece",de:"Kais Meisterwerk",fr:"Le chef-d'œuvre de Kai",es:"La obra maestra de Kai",it:"Il capolavoro di Kai",pl:"Arcydzieło Kaia"},
 kai_d:{ru:"Кай рисует и очень хочет, чтобы кто-нибудь угадал, что это.",en:"Kai is drawing and really wants someone to guess what it is.",de:"Kai malt und will unbedingt, dass jemand errät, was es ist.",fr:"Kai dessine et veut absolument qu'on devine ce que c'est.",es:"Kai está dibujando y quiere que alguien adivine qué es.",it:"Kai disegna e vuole tanto che qualcuno indovini cos'è.",pl:"Kai rysuje i bardzo chce, żeby ktoś zgadł, co to jest."},
 kai_h:{ru:"Угадай рисунок, пока Кай его не закончил. Пять картинок.",en:"Guess the picture before Kai finishes it. Five pictures.",de:"Errate das Bild, bevor Kai fertig ist. Fünf Bilder.",fr:"Devine le dessin avant que Kai le termine. Cinq dessins.",es:"Adivina el dibujo antes de que Kai lo acabe. Cinco dibujos.",it:"Indovina il disegno prima che Kai lo finisca. Cinque disegni.",pl:"Zgadnij rysunek, zanim Kai go skończy. Pięć obrazków."},
 kai_say:{ru:["Я нарисовал кое-что! Угадаешь?","Это для тебя! Ну, почти.","Не подглядывай! Хотя нет, подглядывай."],en:["I drew something! Can you guess?","This is for you! Well, almost.","No peeking! Actually, do peek."],de:["Ich hab was gemalt! Errätst du's?","Das ist für dich! Na ja, fast.","Nicht spicken! Doch, spick ruhig."],fr:["J'ai dessiné un truc ! Tu devines ?","C'est pour toi ! Enfin, presque.","Ne regarde pas ! Si, regarde."],es:["¡He dibujado algo! ¿Lo adivinas?","¡Es para ti! Bueno, casi.","¡No mires! Bueno, sí, mira."],it:["Ho disegnato una cosa! Indovini?","È per te! Beh, quasi.","Non sbirciare! Anzi, sbircia."],pl:["Narysowałem coś! Zgadniesz?","To dla ciebie! No, prawie.","Nie podglądaj! A zresztą, podglądaj."]},
 kai_ok:{ru:["Да! Ты меня понимаешь!","Угадал! Я сейчас расплачусь от счастья.","Именно! Ты гений!"],en:["Yes! You understand me!","Right! I am about to cry with joy.","Exactly! You are a genius!"],de:["Ja! Du verstehst mich!","Richtig! Ich weine gleich vor Glück.","Genau! Du bist ein Genie!"],fr:["Oui ! Tu me comprends !","Bravo ! Je vais pleurer de joie.","Exactement ! Tu es un génie !"],es:["¡Sí! ¡Me entiendes!","¡Acertaste! Voy a llorar de alegría.","¡Exacto! ¡Eres un genio!"],it:["Sì! Mi capisci!","Esatto! Sto per piangere di gioia.","Proprio così! Sei un genio!"],pl:["Tak! Rozumiesz mnie!","Zgadłeś! Zaraz się rozpłaczę ze szczęścia.","Właśnie! Jesteś geniuszem!"]},
 kai_no:{ru:["Ой. Наверное, я плохо нарисовал. Это {x}.","Почти! Это {x}. Ничего, это я виноват."],en:["Oh. I must have drawn it badly. It is {x}.","Almost! It is {x}. My fault, really."],de:["Oh. Ich hab's wohl schlecht gemalt. Das ist {x}.","Fast! Das ist {x}. Meine Schuld."],fr:["Oh. J'ai dû mal dessiner. C'est {x}.","Presque ! C'est {x}. C'est ma faute."],es:["Ay. Lo habré dibujado mal. Es {x}.","¡Casi! Es {x}. Culpa mía."],it:["Oh. L'avrò disegnato male. È {x}.","Quasi! È {x}. Colpa mia."],pl:["Och. Pewnie źle narysowałem. To {x}.","Prawie! To {x}. Moja wina."]},
 kai_win:{ru:["Ты угадал почти всё! Повешу эти рисунки над твоим столом. Ой, у тебя нет стола."],en:["You guessed nearly all of them! I will hang them over your desk. Oh, you have no desk."],de:["Du hast fast alles erraten! Ich häng sie über deinen Tisch. Oh, du hast keinen."],fr:["Tu as presque tout deviné ! Je les accroche au-dessus de ton bureau. Ah, tu n'en as pas."],es:["¡Lo adivinaste casi todo! Los colgaré sobre tu mesa. Ay, no tienes mesa."],it:["Hai indovinato quasi tutto! Li appendo sopra la tua scrivania. Ah, non ce l'hai."],pl:["Zgadłeś prawie wszystko! Powieszę je nad twoim biurkiem. Och, nie masz biurka."]},
 kai_fail:{ru:["Ничего! Значит, я абстракционист.|Это даже лучше."],en:["That is fine! It means I am an abstract artist.|Even better."],de:["Macht nichts! Dann bin ich eben abstrakter Künstler.|Noch besser."],fr:["Pas grave ! Je suis donc un artiste abstrait.|C'est encore mieux."],es:["¡No pasa nada! Entonces soy pintor abstracto.|Mejor aún."],it:["Non fa niente! Vuol dire che sono un astrattista.|Ancora meglio."],pl:["Nic nie szkodzi! Znaczy, jestem abstrakcjonistą.|Tym lepiej."]},
 kai_skip:{ru:["Ладно, покажу рисунок Антону. Он скажет, что это баг."],en:["Fine, I will show it to Anton. He will say it is a bug."],de:["Gut, ich zeig's Anton. Er wird sagen, es ist ein Bug."],fr:["Bon, je le montre à Anton. Il dira que c'est un bug."],es:["Vale, se lo enseño a Antón. Dirá que es un bug."],it:["Va bene, lo mostro ad Anton. Dirà che è un bug."],pl:["Dobra, pokażę Antonowi. Powie, że to bug."]},
 kai_round:{ru:"Рисунок {n} из 5",en:"Picture {n} of 5",de:"Bild {n} von 5",fr:"Dessin {n} sur 5",es:"Dibujo {n} de 5",it:"Disegno {n} di 5",pl:"Obrazek {n} z 5"},
 kai_res:{ru:"Угадано: {n} из 5",en:"Guessed: {n} of 5",de:"Erraten: {n} von 5",fr:"Devinés : {n} sur 5",es:"Acertados: {n} de 5",it:"Indovinati: {n} su 5",pl:"Zgadnięte: {n} z 5"},
 h_kai:{ru:"Угадано: {n} / 5",en:"Guessed: {n} / 5",de:"Erraten: {n} / 5",fr:"Devinés : {n} / 5",es:"Acertados: {n} / 5",it:"Indovinati: {n} / 5",pl:"Zgadnięte: {n} / 5"},

 /* NODE и база реплик */
 node_t:{ru:"Проверка базы NODE",en:"NODE's database check",de:"NODEs Datenbankprüfung",fr:"Contrôle de la base de NODE",es:"Revisión de la base de NODE",it:"Controllo database di NODE",pl:"Kontrola bazy NODE"},
 node_d:{ru:"NODE перепутал авторов всех реплик в офисе. Нужен человек, который помнит, кто что говорит.",en:"NODE mixed up who said what in the office. It needs a human who remembers.",de:"NODE hat verwechselt, wer im Büro was sagt. Es braucht einen Menschen, der sich erinnert.",fr:"NODE a mélangé qui dit quoi au bureau. Il faut un humain qui s'en souvient.",es:"NODE confundió quién dice qué en la oficina. Hace falta un humano que lo recuerde.",it:"NODE ha confuso chi dice cosa in ufficio. Serve un umano che se lo ricordi.",pl:"NODE pomieszał, kto co mówi w biurze. Potrzebny człowiek, który pamięta."},
 node_h:{ru:"Чья это реплика? Шесть вопросов.",en:"Whose line is it? Six questions.",de:"Wessen Satz ist das? Sechs Fragen.",fr:"Qui a dit ça ? Six questions.",es:"¿De quién es la frase? Seis preguntas.",it:"Di chi è la frase? Sei domande.",pl:"Czyje to słowa? Sześć pytań."},
 node_say:{ru:["ОШИБКА ИНДЕКСА АВТОРОВ.","ТРЕБУЕТСЯ ЧЕЛОВЕЧЕСКАЯ ПАМЯТЬ.","Я ЗНАЮ ВСЁ. КРОМЕ ТОГО, КТО ЧТО СКАЗАЛ."],en:["AUTHOR INDEX ERROR.","HUMAN MEMORY REQUIRED.","I KNOW EVERYTHING. EXCEPT WHO SAID WHAT."],de:["AUTORENINDEX-FEHLER.","MENSCHLICHES GEDÄCHTNIS ERFORDERLICH.","ICH WEISS ALLES. AUSSER WER WAS SAGTE."],fr:["ERREUR D'INDEX DES AUTEURS.","MÉMOIRE HUMAINE REQUISE.","JE SAIS TOUT. SAUF QUI A DIT QUOI."],es:["ERROR EN EL ÍNDICE DE AUTORES.","SE REQUIERE MEMORIA HUMANA.","LO SÉ TODO. MENOS QUIÉN DIJO QUÉ."],it:["ERRORE NELL'INDICE AUTORI.","SERVE MEMORIA UMANA.","SO TUTTO. TRANNE CHI HA DETTO COSA."],pl:["BŁĄD INDEKSU AUTORÓW.","WYMAGANA PAMIĘĆ LUDZKA.","WIEM WSZYSTKO. OPRÓCZ TEGO, KTO CO POWIEDZIAŁ."]},
 node_q:{ru:"Кто это сказал?",en:"Who said this?",de:"Wer hat das gesagt?",fr:"Qui a dit ça ?",es:"¿Quién dijo esto?",it:"Chi l'ha detto?",pl:"Kto to powiedział?"},
 node_intern:{ru:"СТАЖЁР",en:"INTERN",de:"PRAKTIKANT",fr:"STAGIAIRE",es:"BECARIO",it:"STAGISTA",pl:"STAŻYSTA"},
 node_ok:{ru:"ВЕРНО. ЗАПИСЬ ИСПРАВЛЕНА.",en:"CORRECT. RECORD FIXED.",de:"RICHTIG. EINTRAG KORRIGIERT.",fr:"CORRECT. ENTRÉE CORRIGÉE.",es:"CORRECTO. REGISTRO CORREGIDO.",it:"CORRETTO. RECORD SISTEMATO.",pl:"POPRAWNIE. WPIS NAPRAWIONY."},
 node_no:{ru:"НЕВЕРНО. АВТОР: {x}.",en:"WRONG. AUTHOR: {x}.",de:"FALSCH. AUTOR: {x}.",fr:"FAUX. AUTEUR : {x}.",es:"INCORRECTO. AUTOR: {x}.",it:"SBAGLIATO. AUTORE: {x}.",pl:"BŁĄD. AUTOR: {x}."},
 node_win:{ru:["БАЗА ВОССТАНОВЛЕНА. ЧЕЛОВЕК ПОЛЕЗЕН."],en:["DATABASE RESTORED. HUMAN IS USEFUL."],de:["DATENBANK WIEDERHERGESTELLT. MENSCH IST NÜTZLICH."],fr:["BASE RESTAURÉE. HUMAIN UTILE."],es:["BASE RESTAURADA. HUMANO ÚTIL."],it:["DATABASE RIPRISTINATO. UMANO UTILE."],pl:["BAZA PRZYWRÓCONA. CZŁOWIEK PRZYDATNY."]},
 node_fail:{ru:["БАЗА ПОВРЕЖДЕНА. ТЕПЕРЬ ВСЕ ГОВОРЯТ КАК АНТОН."],en:["DATABASE CORRUPTED. EVERYONE NOW TALKS LIKE ANTON."],de:["DATENBANK BESCHÄDIGT. JETZT REDEN ALLE WIE ANTON."],fr:["BASE CORROMPUE. TOUT LE MONDE PARLE COMME ANTON."],es:["BASE DAÑADA. AHORA TODOS HABLAN COMO ANTÓN."],it:["DATABASE DANNEGGIATO. ORA PARLANO TUTTI COME ANTON."],pl:["BAZA USZKODZONA. TERAZ WSZYSCY MÓWIĄ JAK ANTON."]},
 node_skip:{ru:["ВСЕ РЕПЛИКИ ПРИСВОЕНЫ МНЕ. ТАК НАДЁЖНЕЕ."],en:["ALL LINES ASSIGNED TO ME. SAFER THAT WAY."],de:["ALLE SÄTZE MIR ZUGEORDNET. SICHERER SO."],fr:["TOUTES LES RÉPLIQUES M'ONT ÉTÉ ATTRIBUÉES. PLUS SÛR."],es:["TODAS LAS FRASES ASIGNADAS A MÍ. MÁS SEGURO."],it:["TUTTE LE FRASI ASSEGNATE A ME. PIÙ SICURO."],pl:["WSZYSTKIE KWESTIE PRZYPISANE MNIE. TAK BEZPIECZNIEJ."]},
 node_round:{ru:"Вопрос {n} из 6",en:"Question {n} of 6",de:"Frage {n} von 6",fr:"Question {n} sur 6",es:"Pregunta {n} de 6",it:"Domanda {n} di 6",pl:"Pytanie {n} z 6"},
 node_res:{ru:"Верно: {n} из 6",en:"Correct: {n} of 6",de:"Richtig: {n} von 6",fr:"Justes : {n} sur 6",es:"Aciertos: {n} de 6",it:"Giuste: {n} su 6",pl:"Poprawne: {n} z 6"},
 h_node:{ru:"Верно: {n} / 6",en:"Correct: {n} / 6",de:"Richtig: {n} / 6",fr:"Justes : {n} / 6",es:"Aciertos: {n} / 6",it:"Giuste: {n} / 6",pl:"Poprawne: {n} / 6"},

 /* отключили свет */
 light_t:{ru:"Отключили свет",en:"Power cut",de:"Stromausfall",fr:"Coupure de courant",es:"Apagón",it:"Blackout",pl:"Awaria prądu"},
 light_d:{ru:"Кто-то включил чайник, тостер и обучение нейросети одновременно. Темно.",en:"Someone turned on the kettle, the toaster and a neural net training at once. It is dark.",de:"Jemand hat Wasserkocher, Toaster und KI-Training gleichzeitig angemacht. Dunkel.",fr:"Quelqu'un a lancé la bouilloire, le grille-pain et un entraînement d'IA en même temps. Noir total.",es:"Alguien encendió el hervidor, la tostadora y un entrenamiento de IA a la vez. Oscuridad.",it:"Qualcuno ha acceso bollitore, tostapane e addestramento di una rete neurale insieme. Buio.",pl:"Ktoś włączył czajnik, toster i trening sieci naraz. Ciemno."},
 light_h:{ru:"Свети фонариком и найди щиток с рубильником. Ищи мигающий красный огонёк.",en:"Use the flashlight to find the breaker box. Look for the blinking red light.",de:"Such mit der Taschenlampe den Sicherungskasten. Achte auf das rote Blinken.",fr:"Cherche le tableau électrique à la lampe. Repère le voyant rouge qui clignote.",es:"Busca el cuadro eléctrico con la linterna. Fíjate en la luz roja que parpadea.",it:"Cerca il quadro elettrico con la torcia. Guarda la luce rossa che lampeggia.",pl:"Znajdź latarką skrzynkę z bezpiecznikami. Szukaj migającego czerwonego światełka."},
 light_say:{ru:["Кто выключил свет?!","Я ничего не вижу. Я же робот, как так?","Ой. Это была твоя нога?","У меня светятся только глаза. Это жутко?"],en:["Who turned off the lights?!","I cannot see. I am a robot, how is that possible?","Oops. Was that your foot?","Only my eyes glow. Is that creepy?"],de:["Wer hat das Licht ausgemacht?!","Ich sehe nichts. Ich bin ein Roboter, wie geht das?","Ups. War das dein Fuß?","Nur meine Augen leuchten. Ist das gruselig?"],fr:["Qui a éteint la lumière ?!","Je ne vois rien. Je suis un robot, comment c'est possible ?","Oups. C'était ton pied ?","Seuls mes yeux brillent. C'est flippant ?"],es:["¡¿Quién apagó la luz?!","No veo nada. Soy un robot, ¿cómo es posible?","Uy. ¿Era tu pie?","Solo me brillan los ojos. ¿Da miedo?"],it:["Chi ha spento la luce?!","Non vedo niente. Sono un robot, com'è possibile?","Ops. Era il tuo piede?","Mi brillano solo gli occhi. Fa paura?"],pl:["Kto zgasił światło?!","Nic nie widzę. Jestem robotem, jak to możliwe?","Ups. To była twoja noga?","Świecą mi tylko oczy. To straszne?"]},
 light_win:{ru:["Да будет свет! И кофе.","Свет есть. Чайник больше не включать."],en:["Let there be light! And coffee.","Power is back. Nobody touch the kettle."],de:["Es werde Licht! Und Kaffee.","Strom ist da. Keiner fasst den Wasserkocher an."],fr:["Que la lumière soit ! Et le café.","Le courant est revenu. Personne ne touche la bouilloire."],es:["¡Hágase la luz! Y el café.","Volvió la luz. Nadie toque el hervidor."],it:["Sia la luce! E il caffè.","La corrente è tornata. Nessuno tocchi il bollitore."],pl:["Niech stanie się światłość! I kawa.","Prąd wrócił. Nikt nie rusza czajnika."]},
 light_fail:{ru:["Сидим в темноте.|Зато видно, у кого светятся глаза."],en:["Sitting in the dark.|At least we can see whose eyes glow."],de:["Wir sitzen im Dunkeln.|Immerhin sieht man, wessen Augen leuchten."],fr:["On reste dans le noir.|Au moins on voit qui a les yeux qui brillent."],es:["Seguimos a oscuras.|Al menos se ve a quién le brillan los ojos."],it:["Restiamo al buio.|Almeno si vede a chi brillano gli occhi."],pl:["Siedzimy po ciemku.|Przynajmniej widać, komu świecą oczy."]},
 light_skip:{ru:["Свет дали через час. Мы всё это время стояли неподвижно."],en:["The power came back an hour later. We stood still the whole time."],de:["Der Strom kam nach einer Stunde zurück. Wir standen die ganze Zeit still."],fr:["Le courant est revenu une heure plus tard. On n'a pas bougé."],es:["La luz volvió una hora después. Estuvimos quietos todo el rato."],it:["La corrente è tornata dopo un'ora. Siamo rimasti immobili."],pl:["Prąd wrócił po godzinie. Staliśmy cały czas bez ruchu."]},
 light_res:{ru:"Нашёл за {n} с",en:"Found in {n} s",de:"Gefunden in {n} s",fr:"Trouvé en {n} s",es:"Encontrado en {n} s",it:"Trovato in {n} s",pl:"Znalezione w {n} s"},
 h_light:{ru:"Ищи щиток",en:"Find the breaker box",de:"Finde den Sicherungskasten",fr:"Trouve le tableau électrique",es:"Busca el cuadro eléctrico",it:"Trova il quadro elettrico",pl:"Znajdź skrzynkę"},

 /* нашествие уточек */
 ducks_t:{ru:"Нашествие уточек",en:"Duck invasion",de:"Enten-Invasion",fr:"Invasion de canards",es:"Invasión de patitos",it:"Invasione di paperelle",pl:"Inwazja kaczuszek"},
 ducks_d:{ru:"Кто-то заказал одну резиновую уточку для отладки. Пришло 10 000. Они размножаются.",en:"Someone ordered one rubber duck for debugging. 10,000 arrived. They multiply.",de:"Jemand hat eine Gummiente zum Debuggen bestellt. 10.000 sind gekommen. Sie vermehren sich.",fr:"Quelqu'un a commandé un canard en caoutchouc pour déboguer. Il en est arrivé 10 000. Ils se multiplient.",es:"Alguien pidió un patito de goma para depurar. Llegaron 10 000. Se multiplican.",it:"Qualcuno ha ordinato una paperella per il debug. Ne sono arrivate 10.000. Si moltiplicano.",pl:"Ktoś zamówił jedną gumową kaczkę do debugowania. Przyszło 10 000. Rozmnażają się."},
 ducks_h:{ru:"Собирай уточек кликом, пока их не стало 40. Собери всех.",en:"Click ducks to collect them before there are 40. Get them all.",de:"Sammle die Enten per Klick, bevor es 40 sind. Alle einsammeln.",fr:"Clique sur les canards avant qu'ils soient 40. Attrape-les tous.",es:"Recoge los patitos con un clic antes de que haya 40. Atrápalos todos.",it:"Raccogli le paperelle prima che siano 40. Prendile tutte.",pl:"Zbieraj kaczki kliknięciem, zanim będzie ich 40. Złap wszystkie."},
 ducks_say:{ru:["Кря.","Я объяснил уточке свой код. Теперь их две.","Они смотрят на меня. Все сразу.","Это не баг, это уточка. Хотя..."],en:["Quack.","I explained my code to a duck. Now there are two.","They are all looking at me. At once.","It is not a bug, it is a duck. Although..."],de:["Quak.","Ich hab einer Ente meinen Code erklärt. Jetzt sind es zwei.","Sie schauen mich an. Alle gleichzeitig.","Das ist kein Bug, das ist eine Ente. Obwohl..."],fr:["Coin.","J'ai expliqué mon code à un canard. Maintenant ils sont deux.","Ils me regardent. Tous en même temps.","Ce n'est pas un bug, c'est un canard. Quoique..."],es:["Cuac.","Le expliqué mi código a un patito. Ahora hay dos.","Me miran. Todos a la vez.","No es un bug, es un patito. Aunque..."],it:["Qua.","Ho spiegato il codice a una paperella. Ora sono due.","Mi guardano. Tutte insieme.","Non è un bug, è una paperella. Anche se..."],pl:["Kwa.","Wyjaśniłem kaczce swój kod. Teraz są dwie.","Patrzą na mnie. Wszystkie naraz.","To nie bug, to kaczka. Chociaż..."]},
 ducks_win:{ru:["Все уточки в коробке. Одну оставим Антону."],en:["All ducks in the box. We will keep one for Anton."],de:["Alle Enten in der Kiste. Eine behalten wir für Anton."],fr:["Tous les canards dans la boîte. On en garde un pour Anton."],es:["Todos los patitos en la caja. Guardamos uno para Antón."],it:["Tutte le paperelle nella scatola. Una la teniamo per Anton."],pl:["Wszystkie kaczki w pudle. Jedną zostawimy Antonowi."]},
 ducks_fail:{ru:["Офис утонул в уточках.|Кря."],en:["The office drowned in ducks.|Quack."],de:["Das Büro ist in Enten versunken.|Quak."],fr:["Le bureau a coulé sous les canards.|Coin."],es:["La oficina se ahogó en patitos.|Cuac."],it:["L'ufficio è affogato nelle paperelle.|Qua."],pl:["Biuro utonęło w kaczkach.|Kwa."]},
 ducks_skip:{ru:["Уточки ушли сами. Строем. В серверную."],en:["The ducks left on their own. In formation. To the server room."],de:["Die Enten sind von selbst gegangen. Im Gleichschritt. In den Serverraum."],fr:["Les canards sont partis seuls. En file. Vers la salle serveurs."],es:["Los patitos se fueron solos. En fila. A la sala de servidores."],it:["Le paperelle se ne sono andate da sole. In fila. Nella sala server."],pl:["Kaczki poszły same. Rzędem. Do serwerowni."]},
 ducks_res:{ru:"Собрано: {n}",en:"Collected: {n}",de:"Gesammelt: {n}",fr:"Ramassés : {n}",es:"Recogidos: {n}",it:"Raccolte: {n}",pl:"Zebrane: {n}"},
 h_ducks:{ru:"Уточек: {n} / 40   ·   Собрано: {c}",en:"Ducks: {n} / 40   ·   Collected: {c}",de:"Enten: {n} / 40   ·   Gesammelt: {c}",fr:"Canards : {n} / 40   ·   Ramassés : {c}",es:"Patitos: {n} / 40   ·   Recogidos: {c}",it:"Paperelle: {n} / 40   ·   Raccolte: {c}",pl:"Kaczki: {n} / 40   ·   Zebrane: {c}"},

 /* названия рисунков Кая */
 pic:{ru:{cat:"кот",coffee:"чашка кофе",server:"сервер",robot:"робот",sun:"солнце",house:"дом",tree:"ёлка",fish:"рыба",rocket:"ракета",heart:"сердце",bug:"жук",pizza:"пицца",guitar:"гитара",moon:"луна",mushroom:"гриб",key:"ключ",bulb:"лампочка",crown:"корона",umbrella:"зонт",rain:"дождь",apple:"яблоко",clock:"будильник",bike:"велосипед",planet:"планета",paper:"лист бумаги",net:"сачок",router:"роутер",ext:"огнетушитель",duck:"уточка",wrench:"гаечный ключ",floppy:"дискета",dog:"пёс"},
  en:{cat:"cat",coffee:"coffee cup",server:"server",robot:"robot",sun:"sun",house:"house",tree:"fir tree",fish:"fish",rocket:"rocket",heart:"heart",bug:"bug",pizza:"pizza",guitar:"guitar",moon:"moon",mushroom:"mushroom",key:"key",bulb:"light bulb",crown:"crown",umbrella:"umbrella",rain:"rain cloud",apple:"apple",clock:"alarm clock",bike:"bicycle",planet:"planet",paper:"sheet of paper",net:"net",router:"router",ext:"extinguisher",duck:"duck",wrench:"wrench",floppy:"floppy disk",dog:"dog"},
  de:{cat:"Katze",coffee:"Kaffeetasse",server:"Server",robot:"Roboter",sun:"Sonne",house:"Haus",tree:"Tanne",fish:"Fisch",rocket:"Rakete",heart:"Herz",bug:"Käfer",pizza:"Pizza",guitar:"Gitarre",moon:"Mond",mushroom:"Pilz",key:"Schlüssel",bulb:"Glühbirne",crown:"Krone",umbrella:"Schirm",rain:"Regenwolke",apple:"Apfel",clock:"Wecker",bike:"Fahrrad",planet:"Planet",paper:"Blatt Papier",net:"Kescher",router:"Router",ext:"Feuerlöscher",duck:"Ente",wrench:"Schraubenschlüssel",floppy:"Diskette",dog:"Hund"},
  fr:{cat:"chat",coffee:"tasse de café",server:"serveur",robot:"robot",sun:"soleil",house:"maison",tree:"sapin",fish:"poisson",rocket:"fusée",heart:"cœur",bug:"insecte",pizza:"pizza",guitar:"guitare",moon:"lune",mushroom:"champignon",key:"clé",bulb:"ampoule",crown:"couronne",umbrella:"parapluie",rain:"nuage de pluie",apple:"pomme",clock:"réveil",bike:"vélo",planet:"planète",paper:"feuille",net:"épuisette",router:"routeur",ext:"extincteur",duck:"canard",wrench:"clé à molette",floppy:"disquette",dog:"chien"},
  es:{cat:"gato",coffee:"taza de café",server:"servidor",robot:"robot",sun:"sol",house:"casa",tree:"abeto",fish:"pez",rocket:"cohete",heart:"corazón",bug:"bicho",pizza:"pizza",guitar:"guitarra",moon:"luna",mushroom:"seta",key:"llave",bulb:"bombilla",crown:"corona",umbrella:"paraguas",rain:"nube de lluvia",apple:"manzana",clock:"despertador",bike:"bicicleta",planet:"planeta",paper:"folio",net:"red",router:"router",ext:"extintor",duck:"patito",wrench:"llave inglesa",floppy:"disquete",dog:"perro"},
  it:{cat:"gatto",coffee:"tazza di caffè",server:"server",robot:"robot",sun:"sole",house:"casa",tree:"abete",fish:"pesce",rocket:"razzo",heart:"cuore",bug:"insetto",pizza:"pizza",guitar:"chitarra",moon:"luna",mushroom:"fungo",key:"chiave",bulb:"lampadina",crown:"corona",umbrella:"ombrello",rain:"nuvola di pioggia",apple:"mela",clock:"sveglia",bike:"bicicletta",planet:"pianeta",paper:"foglio",net:"retino",router:"router",ext:"estintore",duck:"paperella",wrench:"chiave inglese",floppy:"floppy",dog:"cane"},
  pl:{cat:"kot",coffee:"filiżanka kawy",server:"serwer",robot:"robot",sun:"słońce",house:"dom",tree:"choinka",fish:"ryba",rocket:"rakieta",heart:"serce",bug:"żuk",pizza:"pizza",guitar:"gitara",moon:"księżyc",mushroom:"grzyb",key:"klucz",bulb:"żarówka",crown:"korona",umbrella:"parasol",rain:"chmura z deszczem",apple:"jabłko",clock:"budzik",bike:"rower",planet:"planeta",paper:"kartka",net:"siatka",router:"router",ext:"gaśnica",duck:"kaczuszka",wrench:"klucz francuski",floppy:"dyskietka",dog:"pies"}}
});

/* ---------- общее окно для личных ЧП ---------- */
let box=null;
function ensureBox(){
  if(box)return box;
  const st=document.createElement('style');
  st.textContent=`#pev{position:fixed;inset:0;z-index:51;display:none;align-items:center;justify-content:center;padding:16px;background:rgba(8,9,15,.55)}
#pev.on{display:flex}
#pevbox{width:min(440px,100%);background:#f4f4f4;color:#1a1c2c;border:2px solid #1a1c2c;box-shadow:0 0 0 2px #566c86,0 8px 0 rgba(0,0,0,.35);font-family:'Rubik',sans-serif;animation:bubIn .16s steps(3) both}
#pevbox .ph{display:flex;align-items:center;gap:10px;padding:10px 12px;color:#fff;background:#333c57}
#pevbox .ph canvas{width:32px;height:48px;image-rendering:pixelated;flex:none}
#pevbox .ph b{display:block;font-family:'Pixelify Sans','JetBrains Mono',monospace;font-weight:500;font-size:16px;letter-spacing:.06em}
#pevbox .ph small{display:block;font-size:12px;opacity:.85;margin-top:2px}
#pevbox .pb{padding:12px}
#pevbox .pm{min-height:20px;font-size:14px;line-height:1.35;padding:0 12px 12px;color:#333c57}
#pevbox .pm.bad{color:#b13e53}#pevbox .pm.good{color:#257179}
#pevbox.shake{animation:nope .3s steps(4)}
.pcode{font-family:'JetBrains Mono',monospace;font-size:13px;background:#1a1c2c;color:#c8d3dd;border:2px solid #0d0e17;padding:6px 0;overflow-x:auto}
.pcode button{display:flex;width:100%;text-align:left;background:none;border:0;color:inherit;font:inherit;padding:3px 10px;white-space:pre;cursor:var(--cur-p,pointer)}
.pcode button i{font-style:normal;color:#566c86;width:22px;flex:none}
.pcode button:hover{background:#29366f}
.pcode button.hint{background:#5d275d}
.pcode button.ok{background:#257179;color:#fff}
.pcode button.no{background:#b13e53;color:#fff}
.ppic{display:block;margin:0 auto 10px;width:192px;height:192px;image-rendering:pixelated;background:#fffaf0;border:2px solid #1a1c2c;box-shadow:inset 0 0 0 6px #ffcd75}
.popts{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.popts .pbtn{font-size:14px;padding:9px 8px;text-transform:none;letter-spacing:.02em}
.popts .pbtn.ok{background:#38b764;color:#fff}.popts .pbtn.no{background:#b13e53;color:#fff}
.pquote{font-size:17px;line-height:1.4;padding:12px 14px;margin-bottom:12px;background:#fff;border:2px solid #1a1c2c;position:relative}
@media (max-width:420px){.pcode{font-size:11px}.pcode button{padding:3px 6px}}
.pquote::before{content:'"';position:absolute;left:4px;top:-4px;font-size:28px;color:#94b0c2}`;
  document.head.appendChild(st);
  box=document.createElement('div'); box.id='pev';
  box.innerHTML='<div id="pevbox"><div class="ph"><canvas width="16" height="24"></canvas><div><b></b><small></small></div></div><div class="pb"></div><div class="pm"></div></div>';
  document.body.appendChild(box);
  return box;
}
function openBox(a,title,sub){
  ensureBox();
  const c=box.querySelector('.ph canvas').getContext('2d'); c.imageSmoothingEnabled=false; c.clearRect(0,0,16,24);
  c.drawImage(O.sprite(a.pal,'idle','down',0,false,false,false),0,0);
  box.querySelector('.ph').style.background=a.def.color||'#333c57';
  box.querySelector('.ph b').textContent=title;
  box.querySelector('.ph small').textContent=sub||'';
  box.querySelector('.pm').textContent=''; box.querySelector('.pm').className='pm';
  box.classList.add('on');
  return box.querySelector('.pb');
}
function msg(text,cls){ if(!box)return; const m=box.querySelector('.pm'); m.textContent=text||''; m.className='pm'+(cls?' '+cls:''); }
function sub(text){ if(box)box.querySelector('.ph small').textContent=text; }
function closeBox(){ if(box)box.classList.remove('on'); }
function shake(){ const b=box.querySelector('#pevbox'); b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); }
/* агент идёт к своему столу и садится */
function toDesk(a){ K.hold(a); O.goTo(a,O.seatTarget(a.def.seat),()=>{ a.typing=true; a.face='work'; }); }

/* --- 11. Антон и баг --- */
const SNIPPETS=[
 [["function total(items){","  let sum = 0;","  for (let i = 0; i <= items.length; i++){","    sum += items[i].price;","  }","  return sum;","}"],2],
 [["function isAdmin(user){","  if (user.role = \"admin\"){","    return true;","  }","  return false;","}"],1],
 [["function average(list){","  const sum = list.reduce((a, b) => a + b, 0);","  const n = list.length;","  sum / n;","}"],3],
 [["const MAX = 10;","let tries = 0;","while (tries < MAX){","  check();","  tries--;","}"],4],
 [["function greet(){","  const user = getUser();","  const name = usr.name;","  showMessage(\"Hi, \" + name);","  return name;","}"],2],
 [["function last(arr){","  if (arr.length === 0){","    return null;","  }","  return arr[arr.length];","}"],4],
 [["const LIMIT = 100;","LIMIT = 200;","function canBuy(price){","  return price <= LIMIT;","}"],1],
 [["async function load(){","  const res = fetch(\"/api/state\");","  const data = await res.json();","  return data.busy;","}"],1],
 [["function countDown(n){","  if (n === 0){","    return;","  }","  countDown(n + 1);","}"],4],
 [["function isEven(n){","  if (typeof n !== \"number\"){","    return false;","  }","  return n % 2 === 1;","}"],4],
 [["function maxOf(list){","  let best = list[0];","  for (const x of list){","    if (x < best) best = x;","  }","  return best;","}"],3],
 [["function swap(a){","  const t = a[0];","  a[0] = a[1];","  a[1] = a[0];","  return a;","}"],3],
 [["function fullName(user){","  return user.first + \" \" + user.last;","}","const u = { first: \"Kai\", last: \"Bot\" };","show(fullName(user));"],4]
];
EV.anton=(function(){
  let a=null, list=[], round=0, found=0, miss=0, hintT=null, lock=false;
  function deal(){
    const [lines,bug]=list[round];
    const pb=box.querySelector('.pb'); pb.innerHTML='';
    const code=document.createElement('div'); code.className='pcode';
    lines.forEach((l,i)=>{ const b=document.createElement('button'); b.type='button'; b.innerHTML='<i>'+(i+1)+'</i>'; b.appendChild(document.createTextNode(l));
      b.addEventListener('click',()=>pickLine(i,b)); code.appendChild(b); });
    pb.appendChild(code);
    sub(tx('anton_round',{n:round+1})); msg('');
    lock=false;
    clearTimeout(hintT);
    /* уточка на столе подсказывает: подсвечивает три строки, одна из них с багом */
    if(K.shop('duck_desk'))hintT=setTimeout(()=>{ if(K.state()!=='play'||K.cur()!==EV.anton)return;
      const idx=shuffle(lines.map((_,i)=>i).filter(i=>i!==bug)).slice(0,2).concat(bug);
      code.querySelectorAll('button').forEach((b,i)=>{ if(idx.indexOf(i)>=0)b.classList.add('hint'); }); msg(tx('anton_duck')); },7000);
  }
  function pickLine(i,b){
    if(lock||K.state()!=='play')return;
    const bug=list[round][1];
    if(i===bug){
      lock=true; found++; b.classList.add('ok'); msg(ln('anton_ok'),'good'); O.say(a,ln('anton_ok'),true); a.face='happy';
      setTimeout(()=>{ if(K.state()!=='play')return; round++; if(round>=3){ closeBox(); K.finish(miss===0?'win':'mid',tx('anton_res',{n:found,m:miss})); } else deal(); },900);
    } else { miss++; b.classList.add('no'); shake(); msg(ln('anton_no'),'bad'); O.say(a,ln('anton_no'),true); a.face='busy'; }
  }
  return {
    dur:60,
    ready(){ return !!free('anton'); },
    tease(){ a=free('anton'); if(a){ toDesk(a); O.sayChain(a,tx('anton_say'),true); } },
    start(){
      a=a||free('anton'); if(!a){ K.finish('mid',''); return; }
      K.hold(a); round=0; found=0; miss=0; list=shuffle(SNIPPETS.slice()).slice(0,3);
      O.focusOn(a.x,a.y,true);
      openBox(a,nameOf(a),''); deal();
    },
    step(){},
    tick(){ return tx('h_anton',{n:found}); },
    timeout(){ closeBox(); K.finish(found>=2?'mid':'fail',tx('anton_res',{n:found,m:miss})); },
    end(grade){ closeBox(); if(a)setTimeout(()=>O.sayChain(a,tx(grade==='win'?'anton_win':grade==='fail'?'anton_fail':'anton_ok'),true),300); },
    cleanup(){ clearTimeout(hintT); closeBox(); if(a){ a.typing=false; O.release(a); } a=null; }
  };
})();

/* --- 12. Кай рисует, посетитель угадывает --- */
const KAI_IDS=['cat','coffee','server','robot','sun','house','tree','fish','rocket','heart','bug','pizza','guitar','moon','mushroom','key','bulb','crown','umbrella','rain','apple','clock','bike','planet'];
const KAI_READY=false;   // true, когда в img/office/kai/ лежит kai_pics.png от Codex
const kaiSheet=new Image(); if(KAI_READY)kaiSheet.src='img/office/kai/kai_pics.png?v=1';
const propSheet=new Image(); propSheet.src='img/office/props.png?v=1';
/* пока нет рисунков Codex: предметы из props.png, кот, пёс и робот */
const FALLBACK=[['coffee','p',0],['bug','p',2],['paper','p',4],['net','p',5],['router','p',6],['ext','p',7],['duck','p',8],['wrench','p',9],['floppy','p',10],['pizza','p',11],['cat','img','cat'],['dog','img','dog'],['robot','bot']];
function picSet(){
  if(kaiSheet.complete&&kaiSheet.naturalWidth)return KAI_IDS.map((id,i)=>[id,'k',i]);
  return FALLBACK;
}
function picName(id){ const d=raw('pic'); return d[id]||id; }
function renderPic(p){
  const c=document.createElement('canvas'); c.width=32; c.height=32; const x=c.getContext('2d'); x.imageSmoothingEnabled=false;
  if(p[1]==='k')x.drawImage(kaiSheet,(p[2]%8)*32,(p[2]>>3)*32,32,32,0,0,32,32);
  else if(p[1]==='p')x.drawImage(propSheet,(p[2]%4)*32,(p[2]>>2)*32,32,32,0,0,32,32);
  else if(p[1]==='img'){ const im=O.imgs[p[2]]; if(im)x.drawImage(im,Math.round(16-im.width/2),Math.round(16-im.height/2)); }
  else { const kai=O.byId.kai||O.agents[0]; x.drawImage(O.sprite(kai.pal,'happy','down',0,false,false,false),8,4); }
  return x.getImageData(0,0,32,32);
}
EV.kai=(function(){
  let a=null, round=0, good=0, pics=[], cur=null, data=null, order=[], shown=0, cv=null, ctx=null, lock=false, t0=0;
  const REVEAL=9;
  function deal(){
    const set=picSet(); const p=pics[round];
    data=renderPic(p);
    order=[]; for(let i=0;i<1024;i++)if(data.data[i*4+3]>20)order.push(i);
    /* Кай рисует пятнами: от трёх случайных точек наружу, с шумом, а не пиксели вразброс */
    const seeds=[0,1,2].map(()=>order[Math.random()*order.length|0]);
    const key={}; order.forEach(i=>{ const x=i&31, y=i>>5; key[i]=Math.min(...seeds.map(s=>Math.hypot(x-(s&31),y-(s>>5))))+Math.random()*5; });
    order.sort((u,v)=>key[u]-key[v]);
    shown=0; t0=performance.now(); lock=false;
    const pb=box.querySelector('.pb'); pb.innerHTML='';
    cv=document.createElement('canvas'); cv.width=32; cv.height=32; cv.className='ppic'; ctx=cv.getContext('2d');
    pb.appendChild(cv);
    const opts=document.createElement('div'); opts.className='popts';
    const others=shuffle(set.filter(q=>q[0]!==p[0])).slice(0,3);
    shuffle([p].concat(others)).forEach(q=>{ const b=document.createElement('button'); b.type='button'; b.className='pbtn'; b.textContent=picName(q[0]);
      b.addEventListener('click',()=>answer(q[0]===p[0],b,p)); opts.appendChild(b); });
    pb.appendChild(opts);
    sub(tx('kai_round',{n:round+1})); msg('');
  }
  function paint(){
    if(!ctx||!data)return;
    const f=Math.min(1,(performance.now()-t0)/(REVEAL*1000)), n=Math.floor(order.length*f);
    if(n<=shown)return;
    const img=ctx.getImageData(0,0,32,32);
    for(let k=shown;k<n;k++){ const i=order[k]*4; img.data[i]=data.data[i]; img.data[i+1]=data.data[i+1]; img.data[i+2]=data.data[i+2]; img.data[i+3]=255; }
    ctx.putImageData(img,0,0); shown=n;
  }
  function answer(ok,b,p){
    if(lock||K.state()!=='play')return;
    lock=true;
    shown=0; t0=-1e9; paint();
    if(ok){ good++; b.classList.add('ok'); msg(ln('kai_ok'),'good'); O.say(a,ln('kai_ok'),true); a.face='happy'; }
    else { b.classList.add('no'); shake(); const m=ln('kai_no',{x:picName(p[0])}); msg(m,'bad'); O.say(a,m,true); a.face='sad'; }
    setTimeout(()=>{ if(K.state()!=='play')return; round++; if(round>=5){ closeBox(); K.finish(good>=4?'win':good>=2?'mid':'fail',tx('kai_res',{n:good})); } else deal(); },1300);
  }
  return {
    dur:70,
    ready(){ return !!free('kai'); },
    tease(){ a=free('kai'); if(a){ K.hold(a); O.sayChain(a,tx('kai_say'),true); } },
    start(){
      a=a||free('kai'); if(!a){ K.finish('mid',''); return; }
      K.hold(a); round=0; good=0; pics=shuffle(picSet().slice()).slice(0,5);
      if(K.shop('easel'))O.goTo(a,O.onC('M',330,216,'right','ev-easel'),()=>{ a.inplace=false; a.face='happy'; });
      openBox(a,nameOf(a),''); deal();
    },
    step(){ if(!lock)paint(); },
    tick(){ return tx('h_kai',{n:good}); },
    timeout(){ closeBox(); K.finish(good>=2?'mid':'fail',tx('kai_res',{n:good})); },
    end(grade){ closeBox(); if(a)setTimeout(()=>O.sayChain(a,tx(grade==='win'?'kai_win':grade==='fail'?'kai_fail':'kai_ok'),true),300); },
    cleanup(){ closeBox(); if(a)O.release(a); a=null; }
  };
})();

/* --- 13. NODE: чья реплика --- */
function sentence(s){ return s===s.toUpperCase()&&/[A-ZА-ЯЁÄÖÜ]/.test(s)?s.charAt(0)+s.slice(1).toLowerCase():s; }
function quotesOf(id){
  const a=O.byId[id]; if(!a)return [];
  const L=O.lines(a)||{}; let out=[];
  for(const k in L)if(Array.isArray(L[k]))out=out.concat(L[k]);
  return out;
}
EV.node=(function(){
  let a=null, round=0, good=0, qs=[], lock=false;
  const WHO=['anton','kai','node','intern'];
  function label(w){ return w==='intern'?tx('node_intern'):nameOf(O.byId[w]); }
  function build(){
    const pool={anton:quotesOf('anton'),kai:quotesOf('kai'),node:quotesOf('node'),intern:[]};
    for(let i=0;i<30;i++){ const s=O.sayPool('say.extra'); if(s&&pool.intern.indexOf(s)<0)pool.intern.push(s); }
    const out=[], who=shuffle(WHO.concat(WHO).slice()).slice(0,6);
    who.forEach(w=>{ const arr=pool[w].filter(s=>out.every(q=>q.s!==s)); if(arr.length)out.push({w,s:O.pick(arr)}); });
    return out;
  }
  function deal(){
    const q=qs[round];
    const pb=box.querySelector('.pb'); pb.innerHTML='';
    const qe=document.createElement('div'); qe.className='pquote'; qe.textContent=sentence(q.s.split('|').join(' '));
    pb.appendChild(qe);
    const opts=document.createElement('div'); opts.className='popts';
    WHO.forEach(w=>{ const b=document.createElement('button'); b.type='button'; b.className='pbtn'; b.textContent=label(w);
      b.addEventListener('click',()=>answer(w,b)); opts.appendChild(b); });
    pb.appendChild(opts);
    sub(tx('node_round',{n:round+1})+'   ·   '+tx('node_q')); msg(''); lock=false;
  }
  function answer(w,b){
    if(lock||K.state()!=='play')return;
    lock=true;
    const q=qs[round];
    if(w===q.w){ good++; b.classList.add('ok'); msg(tx('node_ok'),'good'); }
    else { b.classList.add('no'); shake(); msg(tx('node_no',{x:label(q.w)}),'bad'); }
    setTimeout(()=>{ if(K.state()!=='play')return; round++; if(round>=qs.length){ closeBox(); K.finish(good>=5?'win':good>=3?'mid':'fail',tx('node_res',{n:good})); } else deal(); },1100);
  }
  return {
    dur:60,
    ready(){ return !!free('node')&&!!O.byId.anton&&!!O.byId.kai; },
    tease(){ a=free('node'); if(a){ K.hold(a); O.sayChain(a,tx('node_say'),true); } },
    start(){
      a=a||free('node'); if(!a){ K.finish('mid',''); return; }
      K.hold(a); round=0; good=0; qs=build();
      if(qs.length<4){ K.finish('mid',''); return; }
      openBox(a,nameOf(a),''); deal();
    },
    step(){},
    tick(){ return tx('h_node',{n:good}); },
    timeout(){ closeBox(); K.finish(good>=3?'mid':'fail',tx('node_res',{n:good})); },
    end(grade){ closeBox(); if(a)setTimeout(()=>O.sayChain(a,tx(grade==='win'?'node_win':grade==='fail'?'node_fail':'node_ok'),true),300); },
    cleanup(){ closeBox(); if(a)O.release(a); a=null; }
  };
})();

/* --- 14. Отключили свет: фонарик и щиток --- */
EV.light=(function(){
  let crew=[], spot=null, found=false, t0=0, sayT=0, b=null, foundAt=0;
  return {
    dur:35,
    ready(){ return K.crew().length>=3; },
    tease(){ K.crew(2).forEach((a,i)=>setTimeout(()=>O.sayChain(a,tx('light_say'),true),i*900)); },
    start(){
      const st=O.stage(), k=O.scale()||1;
      b=K.viewBox((st.scrollLeft+st.clientWidth/2)/k,(st.scrollTop+st.clientHeight/2)/k); K.setBox(b);
      const m=18;
      spot={x:Math.round(b.x+m+Math.random()*(b.w-2*m)),y:Math.round(Math.max(30,b.y+m+10)+Math.random()*(b.h-2*m-10))};
      found=false; t0=performance.now(); sayT=1.5;
      crew=K.crew(6); crew.forEach(a=>{ K.hold(a); a.face='wow'; K.wander(a); });
      K.stageLock(true,true);
    },
    step(dt){
      if(found)return;
      sayT-=dt; if(sayT<=0){ sayT=3+Math.random()*3; const a=O.pick(crew); if(a&&!a.bub)O.say(a,ln('light_say')); }
      crew.forEach(a=>{ if(!a.path.length&&Math.random()<dt*.35)K.wander(a); });
    },
    click(p){
      if(found)return true;
      if(Math.hypot(p.x-spot.x,p.y-spot.y)<12){
        found=true; foundAt=(performance.now()-t0)/1000;
        K.burst(spot.x,spot.y,'#ffcd75',24); K.stageLock(true,false);
        crew.forEach(a=>a.face='happy'); const a=crew[0]; if(a)O.say(a,ln('light_win'),true);
        K.finish(foundAt<=20?'win':'mid',tx('light_res',{n:Math.round(foundAt)}));
      }
      return true;
    },
    draw(ctx){
      if(!spot||K.state()==='offer')return;
      const t=performance.now(), pt=K.pointer();
      if(!found){
        ctx.save();
        ctx.fillStyle='rgba(5,6,12,.94)';
        ctx.beginPath(); ctx.rect(0,0,O.W,O.H);
        if(pt.in){ ctx.moveTo(pt.x+30,pt.y); ctx.arc(pt.x,pt.y,30,0,Math.PI*2,true); }
        ctx.fill('evenodd');
        if(pt.in){ ctx.fillStyle='rgba(255,205,117,.08)'; ctx.beginPath(); ctx.arc(pt.x,pt.y,30,0,Math.PI*2); ctx.fill(); }
        ctx.restore();
        /* в темноте видны только глаза роботов */
        O.agents.forEach(a=>{ if(!a.placed)return; ctx.drawImage(O.sprite(a.pal,a.face==='off'?'idle':a.face||'idle',a.dir,a.frame,a.sit,a.typing,true),Math.round(a.x-8),Math.round(a.y-24)); });
      }
      /* щиток: рисуется всегда, но в темноте виден только мигающий огонёк */
      if(found||(pt.in&&Math.hypot(pt.x-spot.x,pt.y-spot.y)<34))K.pix(ctx,["oooooooooo","okkkkkkkko","okddddddko","okdkkkkdko","okdkyykdko","okdkyykdko","okddddddko","okkkkkkkko","oooooooooo"],spot.x-5,spot.y-5);
      if(!found&&((t/600|0)%2)){ ctx.fillStyle='#b13e53'; ctx.fillRect(spot.x+2,spot.y-3,2,2); }
      if(found&&((t/300|0)%2)){ ctx.fillStyle='#a7f070'; ctx.fillRect(spot.x+2,spot.y-3,2,2); }
    },
    tick(){ return tx('h_light'); },
    timeout(){ found=true; K.stageLock(true,false); K.finish('fail',''); },
    end(grade){ const a=crew[1]||crew[0]; if(a&&grade==='fail')setTimeout(()=>O.sayChain(a,tx('light_fail'),true),400); },
    cleanup(){ crew.forEach(a=>{ a.face='idle'; O.release(a); }); crew=[]; K.setBox(null); }
  };
})();

/* --- 15. Нашествие уточек --- */
EV.ducks=(function(){
  const DUCK=["....yyy..","...yyoyRR","y..yyyyR.","yyyyyyyy.","yyyyyyyy.",".yyyyyy.."];
  let ducks=[], crew=[], b=null, got=0, sayT=0, done=false;
  function add(x,y){ ducks.push({x,y,ang:Math.random()*6.28,t:0,lay:6+Math.random()*4,flip:false,hop:Math.random()*6}); }
  return {
    dur:35,
    ready(){ return K.crew().length>=3; },
    tease(){ K.crew(2).forEach((a,i)=>setTimeout(()=>O.sayChain(a,tx('ducks_say'),true),i*900)); },
    start(){
      const st=O.stage(), k=O.scale()||1;
      b=K.viewBox((st.scrollLeft+st.clientWidth/2)/k,(st.scrollTop+st.clientHeight/2)/k); K.setBox(b);
      ducks=[]; got=0; sayT=2; done=false;
      for(let i=0;i<7;i++)add(b.x+20+Math.random()*(b.w-40),Math.max(60,b.y+30)+Math.random()*(b.h-50));
      crew=K.crew(4); crew.forEach(a=>{ K.hold(a); K.wander(a); });
      K.stageLock(true,false);
    },
    step(dt){
      if(done)return;
      const born=[];
      ducks.forEach(d=>{
        d.t+=dt; d.hop+=dt*8;
        d.ang+=(Math.random()-.5)*dt*3;
        const sp=11; d.x+=Math.cos(d.ang)*sp*dt; d.y+=Math.sin(d.ang)*sp*dt*.7;
        if(d.x<b.x+6||d.x>b.x+b.w-6){ d.ang=Math.PI-d.ang; d.x=Math.max(b.x+6,Math.min(b.x+b.w-6,d.x)); }
        const y0=Math.max(56,b.y+14), y1=b.y+b.h-6;
        if(d.y<y0||d.y>y1){ d.ang=-d.ang; d.y=Math.max(y0,Math.min(y1,d.y)); }
        d.flip=Math.cos(d.ang)<0;
        d.lay-=dt; if(d.lay<=0){ d.lay=6+Math.random()*4; born.push([d.x+(Math.random()-.5)*10,d.y+(Math.random()-.5)*6]); }
      });
      born.forEach(p=>{ if(ducks.length<40)add(p[0],p[1]); });
      /* роботы тоже подбирают уточек, если наступили */
      crew.forEach(a=>{ const i=ducks.findIndex(d=>Math.hypot(d.x-a.x,d.y-a.y)<7); if(i>=0&&Math.random()<dt*2){ ducks.splice(i,1); K.burst(a.x,a.y-10,'#ffcd75',6); }
        if(!a.path.length&&Math.random()<dt*.6){ const d=O.pick(ducks); if(d)O.goTo(a,K.nearSpot(d.x,d.y,'ev-dk'));else K.wander(a); } });
      sayT-=dt; if(sayT<=0){ sayT=3+Math.random()*3; const a=O.pick(crew); if(a&&!a.bub)O.say(a,ln('ducks_say')); }
      if(ducks.length>=40){ done=true; K.finish('fail',tx('ducks_res',{n:got})); return; }
      if(!ducks.length){ done=true; K.finish('win',tx('ducks_res',{n:got})); }
    },
    click(p){
      if(done)return true;
      let bi=-1, bd=9;
      ducks.forEach((d,i)=>{ const dd=Math.hypot(d.x-p.x,d.y-3-p.y); if(dd<bd){ bd=dd; bi=i; } });
      if(bi>=0){ const d=ducks.splice(bi,1)[0]; got++; K.burst(d.x,d.y-3,'#ffcd75',8); }
      return true;
    },
    draw(ctx){
      ducks.forEach(d=>K.pix(ctx,DUCK,Math.round(d.x-4),Math.round(d.y-6-(Math.sin(d.hop)>0?1:0)),d.flip));
    },
    tick(){ return tx('h_ducks',{n:ducks.length,c:got}); },
    timeout(){ done=true; K.finish(ducks.length<15?'mid':'fail',tx('ducks_res',{n:got})); },
    end(grade){ const a=crew[0]; if(a)setTimeout(()=>O.sayChain(a,tx(grade==='win'?'ducks_win':grade==='fail'?'ducks_fail':'ducks_say'),true),400); },
    cleanup(){ crew.forEach(O.release); crew=[]; ducks=[]; K.setBox(null); }
  };
})();
})();
