/* KOTAE!: тексты интерфейса, вступления и реплик ведущей на 7 языках.
   Названия и описания жанров и подтем лежат в catalog.js. */
(function(){
'use strict';

I18n.add('ru',{
  'q.tag':'аниме-викторина',
  'nav.back':'Назад','nav.menu':'Меню','nav.coll':'Коллекция','nav.genres':'Жанры','nav.intro':'Вступление',
  'i.start':'Начать шоу','i.skip':'Пропустить вступление','i.scroll':'листай вниз','i.resume':'Продолжить: {name}',
  'intro.t':['Эфир уже идёт','Один вопрос, четыре ответа','Выбирай свой мир','Десять ступеней','Подсказки в эфире','Карточка за победу','Твой выход'],
  'intro.s':[
    'Весь город смотрит на эту сцену. А ты пока снаружи? Заходи, здесь как раз освободилось место.',
    'Выбирай один из четырёх вариантов. Верный только один. Всё просто, пока не загорится таймер в твоей голове.',
    'Рыбы, ракеты, древние храмы, видеоигры и рок. В каждом жанре есть подтемы. Начни с той, что зовёт тебя.',
    'В подтеме 10 уровней. Для победы нужны 10 верных ответов. На уровнях 1-5 можно ошибиться раз, на 6-10 ошибка завершает игру.',
    'Каждую можно взять раз за уровень: 50/50 уберёт два ответа, NODE назовёт верный, я направлю. Если спрошу "Ты уверен?", можно передумать.',
    'За каждый пройденный уровень получишь карточку. Пройди без ошибок и подсказок, чтобы забрать все три звезды.',
    'Свет на сцене, четыре варианта ждут. Выбирай жанр и покажи, что у тебя в голове. Я рядом.'],
  'host.scene':['Привет! Я веду это шоу. Тыкни в меня, если скучно.','Жми на табличку, в которой уверен. Ну, или почти уверен.',null,'Наверху золото. Посмотрим, кто дойдёт.',null,null,'Свет готов. Выходишь?'],
  'poke':["Эй, у меня тут микрофон!", "Тыкать в ведущую не считается ответом.", "Я тоже часть интерфейса? Любопытно.", "Палец на меня, а варианты скучают.", "Если ищешь секретную кнопку, это не она.", "Щекотно. Теперь смотри на вопрос.", "Я вижу тебя. Очень хорошо вижу.", "Это был тест гарнитуры?", "Карточки у меня, но ответ у тебя.", "Ещё раз ткнёшь, выставлю счёт за конфетти.", "Мой нос не даёт подсказок.", "Вижу, кнопку ответа ты пока не нашёл."],
  'demo.q':'Какая планета ближе всех к Солнцу?','demo.a':['Меркурий','Венера','Марс','Земля'],
  'demo.node':'Расчёт завершён. Верный ответ: {A}.',
  'h.fifty':'50/50','h.node':'Звонок NODE','h.host':'Подсказка ведущей','h.sure':'Ты уверен?',
  'lv.a':'Уровни 1-5','lv.b':'Уровни 6-10',
  'ranks':['Новичок','Любитель','Знаток','Эрудит','Мастер','Эксперт','Профи','Магистр','Гуру','Легенда'],
  'g.h':'Выбери жанр','g.sub':'Жанров: {g}. Подтем: {s}. В каждой 10 уровней.','g.soon':'скоро',
  'g.levels':'Уровней готово: {n} из {t}','g.wip':'Первые вопросы уже пишутся. Пока можно посмотреть все темы.',
  'g.ruonly':'Вопросы пока пишутся на русском, переводы будут позже.',
  's.pick':'Выбери подтему','s.level':'Уровень {n}','s.lsoon':'Вопросы в работе','s.locked':'Сначала пройди уровень {n}',
  's.play':'Играть','s.lives':'Жизни','s.goal':'Цель: 10 верных ответов',
  'c.h':'Коллекция','c.count':'Карточек: {n} из {t}','c.empty':'Пока пусто. За каждый пройденный уровень сюда ляжет своя карточка.',
  'm.gfx':'Графика','gfx.auto':'Авто','gfx.high':'Высокая','gfx.low':'Лёгкая','m.reset':'Сбросить прогресс',
  'm.resetq':'Стереть прогресс и коллекцию?','m.yes':'Да','m.no':'Нет','m.close':'Закрыть'
});

I18n.add('en',{
  'q.tag':'anime quiz show',
  'nav.back':'Back','nav.menu':'Menu','nav.coll':'Collection','nav.genres':'Categories','nav.intro':'Intro',
  'i.start':'Start the show','i.skip':'Skip intro','i.scroll':'scroll down','i.resume':'Continue: {name}',
  'intro.t':['The show is on air','One question, four answers','Choose your world','Ten steps','Help on air','A card for every win','Your turn'],
  'intro.s':[
    'The whole city is watching this stage. And you are still outside? Come in, a seat just opened up.',
    'Pick one of four options. Only one is right. Easy, until the timer starts ticking in your head.',
    'Fish, rockets, ancient temples, video games and rock. Every category has its own topics. Start with the one that calls you.',
    'Each topic has 10 levels. To win you need 10 correct answers. On levels 1-5 you can miss once, on 6-10 one mistake ends the game.',
    'Each can be used once per level: 50/50 removes two answers, NODE names the right one, I point the way. If I ask "Are you sure?", you can change your mind.',
    'Every level you beat gives you a card. Finish without mistakes and hints to take all three stars.',
    'Lights on the stage, four options waiting. Pick a category and show what is in your head. I am right here.'],
  'host.scene':['Hi! I host this show. Poke me if you get bored.','Tap the answer you are sure about. Or almost sure.',null,'Gold is at the top. Let us see who gets there.',null,null,'Lights are ready. Coming out?'],
  'poke':['Hey, I have a microphone here!','Poking the host does not count as an answer.','Am I part of the interface too? Interesting.','Your finger is on me, the answers are getting bored.','Careful, the headset is new.','One more poke and I will ask you a bonus question.'],
  'demo.q':'Which planet is closest to the Sun?','demo.a':['Mercury','Venus','Mars','Earth'],
  'demo.node':'Calculation complete. Correct answer: {A}.',
  'h.fifty':'50/50','h.node':'Call NODE','h.host':'Host hint','h.sure':'Are you sure?',
  'lv.a':'Levels 1-5','lv.b':'Levels 6-10',
  'ranks':['Rookie','Amateur','Connoisseur','Scholar','Master','Expert','Pro','Virtuoso','Guru','Legend'],
  'g.h':'Pick a category','g.sub':'Categories: {g}. Topics: {s}. Each has 10 levels.','g.soon':'soon',
  'g.levels':'Levels ready: {n} of {t}','g.wip':'The first questions are being written. For now you can browse all topics.',
  'g.ruonly':'Questions are written in Russian first. Translations will follow.',
  's.pick':'Pick a topic','s.level':'Level {n}','s.lsoon':'Questions in progress','s.locked':'Beat level {n} first',
  's.play':'Play','s.lives':'Lives','s.goal':'Goal: 10 correct answers',
  'c.h':'Collection','c.count':'Cards: {n} of {t}','c.empty':'Empty for now. Every level you beat adds its own card here.',
  'm.gfx':'Graphics','gfx.auto':'Auto','gfx.high':'High','gfx.low':'Light','m.reset':'Reset progress',
  'm.resetq':'Erase progress and collection?','m.yes':'Yes','m.no':'No','m.close':'Close'
});

I18n.add('de',{
  'q.tag':'Anime-Quizshow',
  'nav.back':'Zurück','nav.menu':'Menü','nav.coll':'Sammlung','nav.genres':'Kategorien','nav.intro':'Intro',
  'i.start':'Show starten','i.skip':'Intro überspringen','i.scroll':'nach unten scrollen','i.resume':'Weiter: {name}',
  'intro.t':['Die Show läuft schon','Eine Frage, vier Antworten','Wähle deine Welt','Zehn Stufen','Hilfe auf Sendung','Eine Karte für jeden Sieg','Dein Auftritt'],
  'intro.s':[
    'Die ganze Stadt schaut auf diese Bühne. Und du stehst noch draußen? Komm rein, gerade ist ein Platz frei geworden.',
    'Wähle eine von vier Antworten. Nur eine stimmt. Ganz einfach, bis in deinem Kopf der Timer tickt.',
    'Fische, Raketen, alte Tempel, Videospiele und Rock. Jede Kategorie hat eigene Themen. Fang mit dem an, das dich ruft.',
    'Jedes Thema hat 10 Level. Zum Sieg brauchst du 10 richtige Antworten. In Level 1-5 darfst du dich einmal irren, in 6-10 beendet ein Fehler das Spiel.',
    'Jede gibt es einmal pro Level: 50/50 streicht zwei Antworten, NODE nennt die richtige, ich gebe einen Wink. Frage ich "Bist du sicher?", darfst du es dir anders überlegen.',
    'Für jedes geschaffte Level bekommst du eine Karte. Ohne Fehler und Hilfen gibt es alle drei Sterne.',
    'Licht auf der Bühne, vier Antworten warten. Wähle eine Kategorie und zeig, was in deinem Kopf steckt. Ich bin da.'],
  'host.scene':['Hi! Ich moderiere diese Show. Stups mich an, wenn dir langweilig ist.','Tipp auf die Antwort, bei der du sicher bist. Oder fast sicher.',null,'Oben wartet Gold. Mal sehen, wer es schafft.',null,null,'Das Licht ist bereit. Kommst du raus?'],
  'poke':['He, ich hab hier ein Mikrofon!','Die Moderatorin anstupsen zählt nicht als Antwort.','Bin ich auch Teil der Oberfläche? Spannend.','Dein Finger ist auf mir, die Antworten langweilen sich.','Vorsicht, das Headset ist neu.','Noch einmal und ich stelle dir eine Extrafrage.'],
  'demo.q':'Welcher Planet ist der Sonne am nächsten?','demo.a':['Merkur','Venus','Mars','Erde'],
  'demo.node':'Berechnung abgeschlossen. Richtige Antwort: {A}.',
  'h.fifty':'50/50','h.node':'NODE anrufen','h.host':'Tipp der Moderatorin','h.sure':'Bist du sicher?',
  'lv.a':'Level 1-5','lv.b':'Level 6-10',
  'ranks':['Neuling','Amateur','Kenner','Gelehrter','Meister','Experte','Profi','Virtuose','Guru','Legende'],
  'g.h':'Wähle eine Kategorie','g.sub':'Kategorien: {g}. Themen: {s}. Jedes hat 10 Level.','g.soon':'bald',
  'g.levels':'Level bereit: {n} von {t}','g.wip':'Die ersten Fragen werden gerade geschrieben. Schau dir schon mal alle Themen an.',
  'g.ruonly':'Die Fragen entstehen zuerst auf Russisch, Übersetzungen folgen.',
  's.pick':'Wähle ein Thema','s.level':'Level {n}','s.lsoon':'Fragen in Arbeit','s.locked':'Schaffe zuerst Level {n}',
  's.play':'Spielen','s.lives':'Leben','s.goal':'Ziel: 10 richtige Antworten',
  'c.h':'Sammlung','c.count':'Karten: {n} von {t}','c.empty':'Noch leer. Jedes geschaffte Level legt hier seine eigene Karte ab.',
  'm.gfx':'Grafik','gfx.auto':'Auto','gfx.high':'Hoch','gfx.low':'Leicht','m.reset':'Fortschritt zurücksetzen',
  'm.resetq':'Fortschritt und Sammlung löschen?','m.yes':'Ja','m.no':'Nein','m.close':'Schließen'
});

I18n.add('fr',{
  'q.tag':'quiz anime',
  'nav.back':'Retour','nav.menu':'Menu','nav.coll':'Collection','nav.genres':'Catégories','nav.intro':'Intro',
  'i.start':'Lancer le show','i.skip':'Passer l\'intro','i.scroll':'fais défiler','i.resume':'Continuer : {name}',
  'intro.t':['L\'émission est en direct','Une question, quatre réponses','Choisis ton monde','Dix marches','Coups de pouce en direct','Une carte par victoire','À toi de jouer'],
  'intro.s':[
    'Toute la ville regarde cette scène. Et toi, tu restes dehors ? Entre, une place vient de se libérer.',
    'Choisis une réponse parmi quatre. Une seule est juste. Facile, jusqu\'à ce que le chrono démarre dans ta tête.',
    'Poissons, fusées, temples anciens, jeux vidéo et rock. Chaque catégorie a ses thèmes. Commence par celui qui t\'appelle.',
    'Chaque thème a 10 niveaux. Pour gagner, il faut 10 bonnes réponses. Aux niveaux 1-5 tu peux te tromper une fois, aux niveaux 6-10 une erreur termine la partie.',
    'Chacun sert une fois par niveau : 50/50 retire deux réponses, NODE donne la bonne, moi je te mets sur la piste. Si je demande "Tu es sûr ?", tu peux changer d\'avis.',
    'Chaque niveau réussi te donne une carte. Sans erreur ni aide, les trois étoiles sont à toi.',
    'Lumières sur la scène, quatre réponses attendent. Choisis une catégorie et montre ce que tu as dans la tête. Je suis là.'],
  'host.scene':['Salut ! C\'est moi qui anime ce show. Clique sur moi si tu t\'ennuies.','Choisis la réponse dont tu es sûr. Ou presque sûr.',null,'L\'or est tout en haut. On verra qui y arrive.',null,null,'Les lumières sont prêtes. Tu montes sur scène ?'],
  'poke':['Hé, j\'ai un micro, moi !','Cliquer sur l\'animatrice ne compte pas comme une réponse.','Je fais partie de l\'interface aussi ? Intéressant.','Ton doigt est sur moi, les réponses s\'ennuient.','Doucement, le casque est neuf.','Encore une fois et je te pose une question bonus.'],
  'demo.q':'Quelle planète est la plus proche du Soleil ?','demo.a':['Mercure','Vénus','Mars','Terre'],
  'demo.node':'Calcul terminé. Bonne réponse : {A}.',
  'h.fifty':'50/50','h.node':'Appeler NODE','h.host':'Indice de l\'animatrice','h.sure':'Tu es sûr ?',
  'lv.a':'Niveaux 1-5','lv.b':'Niveaux 6-10',
  'ranks':['Débutant','Amateur','Connaisseur','Érudit','Maître','Expert','Pro','Virtuose','Gourou','Légende'],
  'g.h':'Choisis une catégorie','g.sub':'Catégories : {g}. Thèmes : {s}. Chacun a 10 niveaux.','g.soon':'bientôt',
  'g.levels':'Niveaux prêts : {n} sur {t}','g.wip':'Les premières questions sont en cours d\'écriture. Tu peux déjà parcourir les thèmes.',
  'g.ruonly':'Les questions sont d\'abord écrites en russe, les traductions suivront.',
  's.pick':'Choisis un thème','s.level':'Niveau {n}','s.lsoon':'Questions en préparation','s.locked':'Termine d\'abord le niveau {n}',
  's.play':'Jouer','s.lives':'Vies','s.goal':'Objectif : 10 bonnes réponses',
  'c.h':'Collection','c.count':'Cartes : {n} sur {t}','c.empty':'Vide pour l\'instant. Chaque niveau réussi ajoute ici sa propre carte.',
  'm.gfx':'Graphismes','gfx.auto':'Auto','gfx.high':'Élevés','gfx.low':'Légers','m.reset':'Réinitialiser la progression',
  'm.resetq':'Effacer la progression et la collection ?','m.yes':'Oui','m.no':'Non','m.close':'Fermer'
});

I18n.add('es',{
  'q.tag':'concurso anime',
  'nav.back':'Atrás','nav.menu':'Menú','nav.coll':'Colección','nav.genres':'Categorías','nav.intro':'Intro',
  'i.start':'Empezar el show','i.skip':'Saltar intro','i.scroll':'desliza hacia abajo','i.resume':'Continuar: {name}',
  'intro.t':['El show ya está en el aire','Una pregunta, cuatro respuestas','Elige tu mundo','Diez peldaños','Ayudas en directo','Una carta por cada victoria','Tu turno'],
  'intro.s':[
    'Toda la ciudad mira este escenario. ¿Y tú sigues fuera? Entra, justo se ha liberado un sitio.',
    'Elige una de cuatro opciones. Solo una es correcta. Fácil, hasta que el reloj empiece a sonar en tu cabeza.',
    'Peces, cohetes, templos antiguos, videojuegos y rock. Cada categoría tiene sus temas. Empieza por el que te llame.',
    'Cada tema tiene 10 niveles. Para ganar necesitas 10 respuestas correctas. En los niveles 1-5 puedes fallar una vez, en los 6-10 un error termina la partida.',
    'Cada una se usa una vez por nivel: 50/50 quita dos respuestas, NODE dice la correcta, yo te doy una pista. Si pregunto "¿Estás seguro?", puedes cambiar de idea.',
    'Cada nivel superado te da una carta. Sin errores ni ayudas te llevas las tres estrellas.',
    'Luces en el escenario, cuatro opciones esperan. Elige una categoría y muestra lo que sabes. Estoy aquí.'],
  'host.scene':['¡Hola! Yo presento este show. Pulsa sobre mí si te aburres.','Pulsa la respuesta de la que estés seguro. O casi.',null,'Arriba está el oro. A ver quién llega.',null,null,'Las luces están listas. ¿Sales?'],
  'poke':['¡Eh, que tengo un micrófono!','Pulsar a la presentadora no cuenta como respuesta.','¿También soy parte de la interfaz? Curioso.','Tu dedo está en mí y las respuestas se aburren.','Cuidado, los auriculares son nuevos.','Una vez más y te hago una pregunta extra.'],
  'demo.q':'¿Qué planeta está más cerca del Sol?','demo.a':['Mercurio','Venus','Marte','Tierra'],
  'demo.node':'Cálculo terminado. Respuesta correcta: {A}.',
  'h.fifty':'50/50','h.node':'Llamar a NODE','h.host':'Pista de la presentadora','h.sure':'¿Estás seguro?',
  'lv.a':'Niveles 1-5','lv.b':'Niveles 6-10',
  'ranks':['Novato','Aficionado','Conocedor','Erudito','Maestro','Experto','Profesional','Virtuoso','Gurú','Leyenda'],
  'g.h':'Elige una categoría','g.sub':'Categorías: {g}. Temas: {s}. Cada uno tiene 10 niveles.','g.soon':'pronto',
  'g.levels':'Niveles listos: {n} de {t}','g.wip':'Las primeras preguntas se están escribiendo. Ya puedes ver todos los temas.',
  'g.ruonly':'Las preguntas se escriben primero en ruso, las traducciones llegarán después.',
  's.pick':'Elige un tema','s.level':'Nivel {n}','s.lsoon':'Preguntas en preparación','s.locked':'Supera antes el nivel {n}',
  's.play':'Jugar','s.lives':'Vidas','s.goal':'Meta: 10 respuestas correctas',
  'c.h':'Colección','c.count':'Cartas: {n} de {t}','c.empty':'Vacío por ahora. Cada nivel superado añade aquí su propia carta.',
  'm.gfx':'Gráficos','gfx.auto':'Auto','gfx.high':'Altos','gfx.low':'Ligeros','m.reset':'Restablecer progreso',
  'm.resetq':'¿Borrar el progreso y la colección?','m.yes':'Sí','m.no':'No','m.close':'Cerrar'
});

I18n.add('it',{
  'q.tag':'quiz anime',
  'nav.back':'Indietro','nav.menu':'Menu','nav.coll':'Collezione','nav.genres':'Categorie','nav.intro':'Intro',
  'i.start':'Inizia lo show','i.skip':'Salta intro','i.scroll':'scorri giù','i.resume':'Continua: {name}',
  'intro.t':['Lo show è in onda','Una domanda, quattro risposte','Scegli il tuo mondo','Dieci gradini','Aiuti in diretta','Una carta per ogni vittoria','Tocca a te'],
  'intro.s':[
    'Tutta la città guarda questo palco. E tu sei ancora fuori? Entra, si è appena liberato un posto.',
    'Scegli una risposta su quattro. Solo una è giusta. Facile, finché non parte il timer nella tua testa.',
    'Pesci, razzi, templi antichi, videogiochi e rock. Ogni categoria ha i suoi temi. Inizia da quello che ti chiama.',
    'Ogni tema ha 10 livelli. Per vincere servono 10 risposte giuste. Nei livelli 1-5 puoi sbagliare una volta, nei 6-10 un errore chiude la partita.',
    'Ognuno si usa una volta per livello: 50/50 toglie due risposte, NODE dice quella giusta, io ti indico la strada. Se chiedo "Sei sicuro?", puoi cambiare idea.',
    'Ogni livello superato ti dà una carta. Senza errori e senza aiuti prendi tutte e tre le stelle.',
    'Luci sul palco, quattro risposte in attesa. Scegli una categoria e mostra cosa sai. Io sono qui.'],
  'host.scene':['Ciao! Conduco io questo show. Cliccami se ti annoi.','Tocca la risposta di cui sei sicuro. O quasi.',null,'In cima c\'è l\'oro. Vediamo chi ci arriva.',null,null,'Le luci sono pronte. Esci?'],
  'poke':['Ehi, ho un microfono qui!','Cliccare la presentatrice non vale come risposta.','Faccio parte anch\'io dell\'interfaccia? Curioso.','Il tuo dito è su di me e le risposte si annoiano.','Piano, le cuffie sono nuove.','Ancora una volta e ti faccio una domanda extra.'],
  'demo.q':'Qual è il pianeta più vicino al Sole?','demo.a':['Mercurio','Venere','Marte','Terra'],
  'demo.node':'Calcolo completato. Risposta giusta: {A}.',
  'h.fifty':'50/50','h.node':'Chiama NODE','h.host':'Aiuto della presentatrice','h.sure':'Sei sicuro?',
  'lv.a':'Livelli 1-5','lv.b':'Livelli 6-10',
  'ranks':['Novellino','Dilettante','Intenditore','Erudito','Maestro','Esperto','Professionista','Virtuoso','Guru','Leggenda'],
  'g.h':'Scegli una categoria','g.sub':'Categorie: {g}. Temi: {s}. Ognuno ha 10 livelli.','g.soon':'presto',
  'g.levels':'Livelli pronti: {n} su {t}','g.wip':'Le prime domande sono in lavorazione. Intanto puoi guardare tutti i temi.',
  'g.ruonly':'Le domande sono scritte prima in russo, le traduzioni arriveranno.',
  's.pick':'Scegli un tema','s.level':'Livello {n}','s.lsoon':'Domande in preparazione','s.locked':'Prima supera il livello {n}',
  's.play':'Gioca','s.lives':'Vite','s.goal':'Obiettivo: 10 risposte giuste',
  'c.h':'Collezione','c.count':'Carte: {n} su {t}','c.empty':'Ancora vuota. Ogni livello superato aggiunge qui la sua carta.',
  'm.gfx':'Grafica','gfx.auto':'Auto','gfx.high':'Alta','gfx.low':'Leggera','m.reset':'Azzera progressi',
  'm.resetq':'Cancellare progressi e collezione?','m.yes':'Sì','m.no':'No','m.close':'Chiudi'
});

I18n.add('pl',{
  'q.tag':'anime quiz',
  'nav.back':'Wstecz','nav.menu':'Menu','nav.coll':'Kolekcja','nav.genres':'Kategorie','nav.intro':'Intro',
  'i.start':'Zacznij show','i.skip':'Pomiń intro','i.scroll':'przewiń w dół','i.resume':'Kontynuuj: {name}',
  'intro.t':['Program już trwa','Jedno pytanie, cztery odpowiedzi','Wybierz swój świat','Dziesięć stopni','Pomoc na wizji','Karta za każdą wygraną','Twoje wejście'],
  'intro.s':[
    'Całe miasto patrzy na tę scenę. A ty wciąż stoisz na zewnątrz? Wejdź, właśnie zwolniło się miejsce.',
    'Wybierz jedną z czterech odpowiedzi. Tylko jedna jest dobra. Proste, dopóki w głowie nie zacznie tykać zegar.',
    'Ryby, rakiety, starożytne świątynie, gry wideo i rock. Każda kategoria ma swoje tematy. Zacznij od tego, który cię woła.',
    'Każdy temat ma 10 poziomów. Do wygranej potrzeba 10 dobrych odpowiedzi. Na poziomach 1-5 możesz pomylić się raz, na 6-10 błąd kończy grę.',
    'Każdej możesz użyć raz na poziom: 50/50 usuwa dwie odpowiedzi, NODE podaje dobrą, ja naprowadzam. Gdy zapytam "Na pewno?", możesz zmienić zdanie.',
    'Za każdy ukończony poziom dostajesz kartę. Bez błędów i podpowiedzi zgarniasz wszystkie trzy gwiazdki.',
    'Światła na scenie, cztery odpowiedzi czekają. Wybierz kategorię i pokaż, co masz w głowie. Jestem obok.'],
  'host.scene':['Cześć! Prowadzę ten program. Kliknij mnie, jeśli się nudzisz.','Kliknij odpowiedź, której jesteś pewien. Albo prawie pewien.',null,'Na górze czeka złoto. Zobaczymy, kto dojdzie.',null,null,'Światła gotowe. Wychodzisz?'],
  'poke':['Hej, mam tu mikrofon!','Klikanie w prowadzącą nie liczy się jako odpowiedź.','Ja też jestem częścią interfejsu? Ciekawe.','Twój palec jest na mnie, a odpowiedzi się nudzą.','Ostrożnie, słuchawki są nowe.','Jeszcze raz i zadam ci pytanie dodatkowe.'],
  'demo.q':'Która planeta jest najbliżej Słońca?','demo.a':['Merkury','Wenus','Mars','Ziemia'],
  'demo.node':'Obliczenia zakończone. Poprawna odpowiedź: {A}.',
  'h.fifty':'50/50','h.node':'Zadzwoń do NODE','h.host':'Podpowiedź prowadzącej','h.sure':'Na pewno?',
  'lv.a':'Poziomy 1-5','lv.b':'Poziomy 6-10',
  'ranks':['Nowicjusz','Amator','Znawca','Erudyta','Mistrz','Ekspert','Zawodowiec','Wirtuoz','Guru','Legenda'],
  'g.h':'Wybierz kategorię','g.sub':'Kategorie: {g}. Tematy: {s}. Każdy ma 10 poziomów.','g.soon':'wkrótce',
  'g.levels':'Gotowe poziomy: {n} z {t}','g.wip':'Pierwsze pytania są w przygotowaniu. Na razie możesz przejrzeć tematy.',
  'g.ruonly':'Pytania powstają najpierw po rosyjsku, tłumaczenia będą później.',
  's.pick':'Wybierz temat','s.level':'Poziom {n}','s.lsoon':'Pytania w przygotowaniu','s.locked':'Najpierw przejdź poziom {n}',
  's.play':'Graj','s.lives':'Życia','s.goal':'Cel: 10 poprawnych odpowiedzi',
  'c.h':'Kolekcja','c.count':'Karty: {n} z {t}','c.empty':'Na razie pusto. Każdy ukończony poziom doda tu swoją kartę.',
  'm.gfx':'Grafika','gfx.auto':'Auto','gfx.high':'Wysoka','gfx.low':'Lekka','m.reset':'Resetuj postęp',
  'm.resetq':'Usunąć postęp i kolekcję?','m.yes':'Tak','m.no':'Nie','m.close':'Zamknij'
});
/* экран игры (v0.2) */
I18n.add('ru',{"p.next": "Дальше", "p.result": "Итог", "p.keep": "Отвечаю", "p.change": "Передумаю", "p.win": "Уровень пройден!", "p.lose": "Уровень не пройден", "p.score": "Верных ответов: {n} из 10", "p.again": "Ещё раз", "p.levels": "К уровням", "p.nextlv": "Уровень {n}", "p.nextsoon": "Следующий уровень скоро", "p.newcard": "Новая карточка!", "p.rightis": "Верный ответ: {A}.", "p.loading": "Загрузка вопросов...", "p.err": "Не удалось загрузить вопросы. Проверь связь и попробуй ещё раз.", "p.ruq": "Вопросы этого уровня пока на русском.", "p.cards": "Карточки", "p.empty": "Пока нет"});
I18n.add('en',{"p.next": "Next", "p.result": "Results", "p.keep": "Final answer", "p.change": "Let me think", "p.win": "Level complete!", "p.lose": "Level failed", "p.score": "Correct answers: {n} of 10", "p.again": "Try again", "p.levels": "To levels", "p.nextlv": "Level {n}", "p.nextsoon": "The next level is coming soon", "p.newcard": "New card!", "p.rightis": "Correct answer: {A}.", "p.loading": "Loading questions...", "p.err": "Could not load the questions. Check the connection and try again.", "p.ruq": "Questions of this level are in Russian for now.", "p.cards": "Cards", "p.empty": "None yet"});
I18n.add('de',{"p.next": "Weiter", "p.result": "Ergebnis", "p.keep": "Ich bleibe dabei", "p.change": "Ich überlege", "p.win": "Level geschafft!", "p.lose": "Level nicht geschafft", "p.score": "Richtige Antworten: {n} von 10", "p.again": "Noch mal", "p.levels": "Zu den Leveln", "p.nextlv": "Level {n}", "p.nextsoon": "Das nächste Level kommt bald", "p.newcard": "Neue Karte!", "p.rightis": "Richtige Antwort: {A}.", "p.loading": "Fragen werden geladen...", "p.err": "Die Fragen konnten nicht geladen werden. Prüfe die Verbindung und versuche es erneut.", "p.ruq": "Die Fragen dieses Levels sind vorerst auf Russisch.", "p.cards": "Karten", "p.empty": "Noch keine"});
I18n.add('fr',{"p.next": "Suivant", "p.result": "Résultat", "p.keep": "Je confirme", "p.change": "Je réfléchis", "p.win": "Niveau réussi !", "p.lose": "Niveau raté", "p.score": "Bonnes réponses : {n} sur 10", "p.again": "Rejouer", "p.levels": "Aux niveaux", "p.nextlv": "Niveau {n}", "p.nextsoon": "Le niveau suivant arrive bientôt", "p.newcard": "Nouvelle carte !", "p.rightis": "Bonne réponse : {A}.", "p.loading": "Chargement des questions...", "p.err": "Impossible de charger les questions. Vérifie la connexion et réessaie.", "p.ruq": "Les questions de ce niveau sont en russe pour l'instant.", "p.cards": "Cartes", "p.empty": "Aucune"});
I18n.add('es',{"p.next": "Siguiente", "p.result": "Resultado", "p.keep": "Respuesta final", "p.change": "Lo pienso", "p.win": "¡Nivel superado!", "p.lose": "Nivel no superado", "p.score": "Respuestas correctas: {n} de 10", "p.again": "Otra vez", "p.levels": "A los niveles", "p.nextlv": "Nivel {n}", "p.nextsoon": "El siguiente nivel llegará pronto", "p.newcard": "¡Carta nueva!", "p.rightis": "Respuesta correcta: {A}.", "p.loading": "Cargando preguntas...", "p.err": "No se pudieron cargar las preguntas. Revisa la conexión e inténtalo de nuevo.", "p.ruq": "Las preguntas de este nivel están en ruso por ahora.", "p.cards": "Cartas", "p.empty": "Ninguna aún"});
I18n.add('it',{"p.next": "Avanti", "p.result": "Risultato", "p.keep": "Confermo", "p.change": "Ci ripenso", "p.win": "Livello superato!", "p.lose": "Livello non superato", "p.score": "Risposte giuste: {n} su 10", "p.again": "Riprova", "p.levels": "Ai livelli", "p.nextlv": "Livello {n}", "p.nextsoon": "Il prossimo livello arriva presto", "p.newcard": "Nuova carta!", "p.rightis": "Risposta giusta: {A}.", "p.loading": "Caricamento domande...", "p.err": "Impossibile caricare le domande. Controlla la connessione e riprova.", "p.ruq": "Le domande di questo livello per ora sono in russo.", "p.cards": "Carte", "p.empty": "Ancora nessuna"});
I18n.add('pl',{"p.next": "Dalej", "p.result": "Wynik", "p.keep": "Zostaję przy tym", "p.change": "Zastanowię się", "p.win": "Poziom ukończony!", "p.lose": "Poziom nieukończony", "p.score": "Poprawne odpowiedzi: {n} z 10", "p.again": "Jeszcze raz", "p.levels": "Do poziomów", "p.nextlv": "Poziom {n}", "p.nextsoon": "Następny poziom już wkrótce", "p.newcard": "Nowa karta!", "p.rightis": "Poprawna odpowiedź: {A}.", "p.loading": "Ładowanie pytań...", "p.err": "Nie udało się wczytać pytań. Sprawdź połączenie i spróbuj ponownie.", "p.ruq": "Pytania tego poziomu są na razie po rosyjsku.", "p.cards": "Karty", "p.empty": "Jeszcze brak"});
})();
