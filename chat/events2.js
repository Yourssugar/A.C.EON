/* A.C.EON · ОФИС ИИ: вторая пачка «ЧП в офисе».
   Перегрев сервера, совещание о совещании, прошивка и пятница 17:59 идут на отдельных сценах (img/office/scene_*.png, 480x270),
   Wi-Fi и принтер прямо в офисе. Движок, очки и плашки в events.js, отсюда только сами игры и их тексты.
   Флаги для проверки: ?event=server|meeting|fw|friday|wifi|printer */
(function(){
'use strict';
const K=window.OfficeEvents&&OfficeEvents.kit; if(!K)return;
const O=K.O, S=K.scene, tx=K.tx, EV=K.EVENTS;
function raw(k){ const o=K.TX[k]; return o[O.lang()]||o.en; }
function ln(k,v){ const s=tx(k,v); return Array.isArray(s)?O.pick(s):s; }
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.random()*(i+1)|0; [a[i],a[j]]=[a[j],a[i]]; } return a; }

Object.assign(K.TX,{
 /* сервер перегрелся */
 server_t:{ru:"Сервер перегрелся",en:"Server overheating",de:"Server überhitzt",fr:"Serveur en surchauffe",es:"Servidor sobrecalentado",it:"Server surriscaldato",pl:"Serwer się przegrzewa"},
 server_d:{ru:"Кто-то запустил обучение нейросети на кофемашине. Стойки горят.",en:"Someone started training a neural net on the coffee machine. The racks are on fire.",de:"Jemand trainiert ein neuronales Netz auf der Kaffeemaschine. Die Racks brennen.",fr:"Quelqu'un entraîne un réseau de neurones sur la machine à café. Les baies chauffent.",es:"Alguien puso a entrenar una red neuronal en la cafetera. Los racks arden.",it:"Qualcuno ha avviato l'addestramento di una rete neurale sulla macchina del caffè. I rack bruciano.",pl:"Ktoś odpalił trening sieci neuronowej na ekspresie. Szafy płoną."},
 server_h:{ru:"Жми на горящие блоки, пока температура не дошла до 100°. Продержись 30 секунд.",en:"Tap the burning units before the temperature hits 100°. Hold out for 30 seconds.",de:"Tippe auf die brennenden Einschübe, bevor es 100° werden. Halte 30 Sekunden durch.",fr:"Touche les unités en feu avant 100°. Tiens 30 secondes.",es:"Toca las unidades que arden antes de llegar a 100°. Aguanta 30 segundos.",it:"Tocca le unità in fiamme prima dei 100°. Resisti 30 secondi.",pl:"Klikaj płonące moduły, zanim będzie 100°. Wytrzymaj 30 sekund."},
 server_say:{ru:["Тут жарче, чем в аду!","Я машу листком. Это помогает?","Кто поставил майнинг на прод?!","Пахнет жареным кремнием."],en:["It is hotter than hell in here!","I am fanning with a sheet of paper. Does it help?","Who put mining on prod?!","Smells like fried silicon."],de:["Hier ist es heißer als in der Hölle!","Ich wedle mit einem Blatt. Hilft das?","Wer hat Mining auf Prod gestartet?!","Riecht nach gebratenem Silizium."],fr:["Il fait plus chaud qu'en enfer !","Je m'évente avec une feuille. Ça aide ?","Qui a lancé du minage en prod ?!","Ça sent le silicium grillé."],es:["¡Aquí hace más calor que en el infierno!","Me abanico con un folio. ¿Sirve de algo?","¿Quién puso minería en producción?!","Huele a silicio frito."],it:["Qui fa più caldo che all'inferno!","Mi faccio aria con un foglio. Serve?","Chi ha messo il mining in produzione?!","Odore di silicio fritto."],pl:["Tu jest goręcej niż w piekle!","Macham kartką. Pomaga?","Kto odpalił kopanie na produkcji?!","Pachnie smażonym krzemem."]},
 server_cool:{ru:["Ух, прохладно.","Минус один пожар.","Ещё!"],en:["Ooh, cool.","One fire down.","More!"],de:["Uh, kühl.","Ein Feuer weniger.","Mehr!"],fr:["Ah, ça rafraîchit.","Un feu de moins.","Encore !"],es:["Uf, fresquito.","Un fuego menos.","¡Más!"],it:["Ah, fresco.","Un incendio in meno.","Ancora!"],pl:["Uff, chłodno.","Jeden pożar mniej.","Jeszcze!"]},
 server_win:{ru:["Сервер жив. Нейросеть на кофемашине выключили.","Температура в норме. Можно снова варить кофе."],en:["The server lives. The coffee machine net is off.","Temperature is fine. Coffee is allowed again."],de:["Der Server lebt. Das Netz auf der Kaffeemaschine ist aus.","Temperatur normal. Kaffee ist wieder erlaubt."],fr:["Le serveur vit. Le réseau de la machine à café est coupé.","Température normale. Le café est de nouveau permis."],es:["El servidor vive. La red de la cafetera está apagada.","Temperatura normal. Ya se puede hacer café."],it:["Il server vive. La rete sulla macchina del caffè è spenta.","Temperatura a posto. Il caffè è di nuovo permesso."],pl:["Serwer żyje. Sieć na ekspresie wyłączona.","Temperatura w normie. Kawa znowu dozwolona."]},
 server_fail:{ru:["Сервер ушёл в оффлайн.|Зато тепло.","100°. Теперь у нас сауна, а не серверная."],en:["The server went offline.|At least it is warm.","100°. We have a sauna now, not a server room."],de:["Der Server ist offline.|Dafür ist es warm.","100°. Jetzt haben wir eine Sauna statt Serverraum."],fr:["Le serveur est hors ligne.|Au moins il fait chaud.","100°. C'est un sauna maintenant."],es:["El servidor se ha caído.|Al menos hace calor.","100°. Ahora tenemos sauna en vez de sala de servidores."],it:["Il server è offline.|Almeno fa caldo.","100°. Ora abbiamo una sauna, non una sala server."],pl:["Serwer padł.|Za to ciepło.","100°. Mamy teraz saunę zamiast serwerowni."]},
 server_skip:{ru:["Сервер сам остыл. Кофемашина обиделась."],en:["The server cooled down by itself. The coffee machine is offended."],de:["Der Server hat sich selbst abgekühlt. Die Kaffeemaschine ist beleidigt."],fr:["Le serveur a refroidi tout seul. La machine à café boude."],es:["El servidor se enfrió solo. La cafetera se ofendió."],it:["Il server si è raffreddato da solo. La macchina del caffè si è offesa."],pl:["Serwer sam ostygł. Ekspres się obraził."]},
 server_res:{ru:"Максимум: {n}°",en:"Peak: {n}°",de:"Maximum: {n}°",fr:"Max : {n}°",es:"Máximo: {n}°",it:"Massimo: {n}°",pl:"Maksimum: {n}°"},
 h_server:{ru:"Температура: {n}°   ·   Потушено: {c}",en:"Temperature: {n}°   ·   Put out: {c}",de:"Temperatur: {n}°   ·   Gelöscht: {c}",fr:"Température : {n}°   ·   Éteints : {c}",es:"Temperatura: {n}°   ·   Apagados: {c}",it:"Temperatura: {n}°   ·   Spenti: {c}",pl:"Temperatura: {n}°   ·   Ugaszone: {c}"},

 /* совещание о совещании */
 meeting_t:{ru:"Совещание о совещании",en:"A meeting about meetings",de:"Meeting über Meetings",fr:"Réunion sur les réunions",es:"Reunión sobre reuniones",it:"Riunione sulle riunioni",pl:"Spotkanie o spotkaniach"},
 meeting_d:{ru:"Всех согнали на совещание. Тема: почему совещания такие длинные. 97 слайдов.",en:"Everyone got pulled into a meeting. Topic: why meetings are so long. 97 slides.",de:"Alle müssen ins Meeting. Thema: warum Meetings so lang sind. 97 Folien.",fr:"Tout le monde en réunion. Sujet : pourquoi les réunions sont si longues. 97 diapos.",es:"A todos los metieron en una reunión. Tema: por qué las reuniones son tan largas. 97 diapositivas.",it:"Tutti in riunione. Tema: perché le riunioni sono così lunghe. 97 slide.",pl:"Wszystkich zagoniono na spotkanie. Temat: czemu spotkania są takie długie. 97 slajdów."},
 meeting_h:{ru:"Буди уснувших кликом. Когда на экране слайд «Можно было письмом», жми на экран.",en:"Click sleepers to wake them. When the slide says it could have been an email, click the screen.",de:"Weck die Schläfer per Klick. Steht auf der Folie, dass es eine Mail hätte sein können, klick auf die Leinwand.",fr:"Clique sur les dormeurs pour les réveiller. Quand la diapo dit que ça aurait pu être un mail, clique sur l'écran.",es:"Haz clic en los dormidos para despertarlos. Cuando la diapositiva diga que podía haber sido un correo, pulsa la pantalla.",it:"Clicca chi dorme per svegliarlo. Quando la slide dice che bastava una mail, clicca lo schermo.",pl:"Budź śpiących kliknięciem. Gdy slajd powie, że to mógł być mail, kliknij ekran."},
 meeting_say:{ru:["Опять совещание?","Я взял подушку. На всякий случай.","Слайд 1 из 97..."],en:["Another meeting?","I brought a pillow. Just in case.","Slide 1 of 97..."],de:["Schon wieder ein Meeting?","Ich hab ein Kissen dabei. Nur für den Fall.","Folie 1 von 97..."],fr:["Encore une réunion ?","J'ai pris un oreiller. Au cas où.","Diapo 1 sur 97..."],es:["¿Otra reunión?","He traído una almohada. Por si acaso.","Diapositiva 1 de 97..."],it:["Un'altra riunione?","Ho portato un cuscino. Non si sa mai.","Slide 1 di 97..."],pl:["Znowu spotkanie?","Wziąłem poduszkę. Na wszelki wypadek.","Slajd 1 z 97..."]},
 meet_slides:{ru:["Повестка: обсудить повестку","Синергия x2","Итоги прошлого совещания","Почему мы опаздываем на совещания","План на квартал (черновик 14)","Слайд 38 из 97","Вопросы? Нет? Ещё 40 слайдов","KPI по KPI","Ретро нашего ретро","Вернёмся к слайду 2","Как сократить совещания (часть 1 из 6)"],en:["Agenda: discuss the agenda","Synergy x2","Results of the last meeting","Why we are late for meetings","Quarter plan (draft 14)","Slide 38 of 97","Questions? No? 40 more slides","KPIs for KPIs","A retro of our retro","Back to slide 2","How to shorten meetings (part 1 of 6)"],de:["Agenda: die Agenda besprechen","Synergie x2","Ergebnisse des letzten Meetings","Warum wir zu spät zu Meetings kommen","Quartalsplan (Entwurf 14)","Folie 38 von 97","Fragen? Nein? Noch 40 Folien","KPIs für KPIs","Retro unserer Retro","Zurück zu Folie 2","Meetings kürzen (Teil 1 von 6)"],fr:["Ordre du jour : discuter l'ordre du jour","Synergie x2","Bilan de la dernière réunion","Pourquoi on arrive en retard aux réunions","Plan du trimestre (brouillon 14)","Diapo 38 sur 97","Des questions ? Non ? Encore 40 diapos","Les KPI des KPI","Rétro de notre rétro","Revenons à la diapo 2","Raccourcir les réunions (partie 1 sur 6)"],es:["Orden del día: discutir el orden del día","Sinergia x2","Resultados de la última reunión","Por qué llegamos tarde a las reuniones","Plan trimestral (borrador 14)","Diapositiva 38 de 97","¿Preguntas? ¿No? 40 diapositivas más","KPI de los KPI","Retro de nuestra retro","Volvamos a la diapositiva 2","Cómo acortar reuniones (parte 1 de 6)"],it:["Ordine del giorno: discutere l'ordine del giorno","Sinergia x2","Esiti dell'ultima riunione","Perché arriviamo tardi alle riunioni","Piano trimestrale (bozza 14)","Slide 38 di 97","Domande? No? Altre 40 slide","KPI dei KPI","Retro della nostra retro","Torniamo alla slide 2","Come accorciare le riunioni (parte 1 di 6)"],pl:["Agenda: omówić agendę","Synergia x2","Wnioski z poprzedniego spotkania","Czemu spóźniamy się na spotkania","Plan na kwartał (szkic 14)","Slajd 38 z 97","Pytania? Nie? Jeszcze 40 slajdów","KPI dla KPI","Retro naszego retro","Wróćmy do slajdu 2","Jak skrócić spotkania (część 1 z 6)"]},
 meet_email:{ru:"Это совещание можно было провести письмом",en:"This meeting could have been an email",de:"Dieses Meeting hätte eine Mail sein können",fr:"Cette réunion aurait pu être un mail",es:"Esta reunión podía haber sido un correo",it:"Questa riunione poteva essere una mail",pl:"To spotkanie mogło być mailem"},
 meet_wake:{ru:["А? Я не сплю!","Я просто закрыл глаза. Думаю.","Что я пропустил? Слайд 2?","Голосую за. За что голосуем?"],en:["Huh? I am awake!","I just closed my eyes. Thinking.","What did I miss? Slide 2?","I vote yes. What are we voting on?"],de:["Hä? Ich bin wach!","Ich hab nur die Augen zu. Denke nach.","Was hab ich verpasst? Folie 2?","Ich stimme dafür. Wofür?"],fr:["Hein ? Je ne dors pas !","J'ai juste fermé les yeux. Je réfléchis.","J'ai raté quoi ? Diapo 2 ?","Je vote pour. On vote quoi ?"],es:["¿Eh? ¡No estoy dormido!","Solo cerré los ojos. Pensaba.","¿Qué me perdí? ¿Diapositiva 2?","Voto a favor. ¿De qué?"],it:["Eh? Sono sveglio!","Ho solo chiuso gli occhi. Penso.","Cosa mi sono perso? Slide 2?","Voto sì. Su cosa?"],pl:["Co? Nie śpię!","Tylko zamknąłem oczy. Myślę.","Co przegapiłem? Slajd 2?","Głosuję za. Za czym?"]},
 meet_awake:{ru:["Я не сплю. Пока.","Не трогай, я записываю.","Слушаю. Почти."],en:["I am awake. For now.","Hands off, I am taking notes.","Listening. Almost."],de:["Ich bin wach. Noch.","Finger weg, ich schreibe mit.","Ich höre zu. Fast."],fr:["Je suis réveillé. Pour l'instant.","Touche pas, je prends des notes.","J'écoute. Presque."],es:["Estoy despierto. De momento.","No toques, estoy tomando notas.","Escucho. Casi."],it:["Sono sveglio. Per ora.","Non toccare, prendo appunti.","Ascolto. Quasi."],pl:["Nie śpię. Na razie.","Nie ruszaj, notuję.","Słucham. Prawie."]},
 meet_wrong:{ru:["Это не тот слайд. Ещё 10 минут.","Вопрос записан. Обсудим на следующем совещании."],en:["Wrong slide. Ten more minutes.","Question noted. We will discuss it at the next meeting."],de:["Falsche Folie. Noch zehn Minuten.","Frage notiert. Klären wir im nächsten Meeting."],fr:["Mauvaise diapo. Dix minutes de plus.","Question notée. On en parlera à la prochaine réunion."],es:["Diapositiva equivocada. Diez minutos más.","Pregunta anotada. La vemos en la próxima reunión."],it:["Slide sbagliata. Altri dieci minuti.","Domanda annotata. Ne parliamo alla prossima riunione."],pl:["Zły slajd. Jeszcze dziesięć minut.","Pytanie zapisane. Omówimy na następnym spotkaniu."]},
 meeting_win:{ru:["Совещание закончилось на 3 часа раньше. Это рекорд.","Свобода! Пишем письмо."],en:["The meeting ended three hours early. A record.","Freedom! Writing an email."],de:["Das Meeting endete drei Stunden früher. Rekord.","Freiheit! Ich schreibe eine Mail."],fr:["La réunion a fini trois heures plus tôt. Record.","Liberté ! On écrit un mail."],es:["La reunión acabó tres horas antes. Récord.","¡Libertad! Escribo un correo."],it:["La riunione è finita tre ore prima. Record.","Libertà! Scrivo una mail."],pl:["Spotkanie skończyło się trzy godziny wcześniej. Rekord.","Wolność! Piszę maila."]},
 meeting_fail:{ru:["Совещание назначило ещё одно совещание.|Завтра в 9:00.","Я проснулся, а уже вторник."],en:["The meeting scheduled another meeting.|Tomorrow at 9:00.","I woke up and it is Tuesday."],de:["Das Meeting hat ein neues Meeting angesetzt.|Morgen um 9:00.","Ich bin aufgewacht und es ist Dienstag."],fr:["La réunion a planifié une autre réunion.|Demain à 9:00.","Je me suis réveillé, on est mardi."],es:["La reunión convocó otra reunión.|Mañana a las 9:00.","Me desperté y ya es martes."],it:["La riunione ha fissato un'altra riunione.|Domani alle 9:00.","Mi sono svegliato ed è martedì."],pl:["Spotkanie zwołało kolejne spotkanie.|Jutro o 9:00.","Obudziłem się, a już wtorek."]},
 meeting_skip:{ru:["Совещание прошло без зрителей. Никто не заметил."],en:["The meeting went on without an audience. Nobody noticed."],de:["Das Meeting lief ohne Publikum. Keiner hat's gemerkt."],fr:["La réunion s'est tenue sans public. Personne n'a remarqué."],es:["La reunión siguió sin público. Nadie lo notó."],it:["La riunione è andata avanti senza pubblico. Nessuno se n'è accorto."],pl:["Spotkanie odbyło się bez widowni. Nikt nie zauważył."]},
 meet_res:{ru:"Не спят: {n} из {m}",en:"Awake: {n} of {m}",de:"Wach: {n} von {m}",fr:"Réveillés : {n} sur {m}",es:"Despiertos: {n} de {m}",it:"Svegli: {n} su {m}",pl:"Przytomni: {n} z {m}"},
 h_meeting:{ru:"Не спят: {n} / {m}",en:"Awake: {n} / {m}",de:"Wach: {n} / {m}",fr:"Réveillés : {n} / {m}",es:"Despiertos: {n} / {m}",it:"Svegli: {n} / {m}",pl:"Przytomni: {n} / {m}"},

 /* обновление прошивки */
 fw_t:{ru:"Обновление прошивки",en:"Firmware update",de:"Firmware-Update",fr:"Mise à jour du firmware",es:"Actualización de firmware",it:"Aggiornamento firmware",pl:"Aktualizacja firmware"},
 fw_d:{ru:"{name} встал на обновление. Установщик задаёт вопросы. Странные.",en:"{name} is updating. The installer asks questions. Weird ones.",de:"{name} wird aktualisiert. Der Installer stellt Fragen. Seltsame.",fr:"{name} se met à jour. L'installeur pose des questions. Bizarres.",es:"{name} se está actualizando. El instalador hace preguntas. Raras.",it:"{name} si sta aggiornando. L'installer fa domande. Strane.",pl:"{name} się aktualizuje. Instalator zadaje pytania. Dziwne."},
 fw_h:{ru:"Отвечай на окна так, чтобы обновление дошло до конца и робот остался собой.",en:"Answer the pop-ups so the update finishes and the robot stays itself.",de:"Beantworte die Fenster so, dass das Update durchläuft und der Roboter er selbst bleibt.",fr:"Réponds aux fenêtres pour que la mise à jour finisse et que le robot reste lui-même.",es:"Responde a las ventanas para que la actualización termine y el robot siga siendo él.",it:"Rispondi alle finestre perché l'aggiornamento finisca e il robot resti se stesso.",pl:"Odpowiadaj na okienka tak, żeby aktualizacja doszła do końca, a robot został sobą."},
 fw_say:{ru:["Я на обновлении. Не выключайте меня.","Устанавливаю... 0%...","Если что, я вас всех любил."],en:["I am updating. Do not switch me off.","Installing... 0%...","If anything goes wrong, I loved you all."],de:["Ich update. Nicht ausschalten.","Installiere... 0%...","Falls was schiefgeht: Ich hab euch alle geliebt."],fr:["Je me mets à jour. Ne m'éteignez pas.","Installation... 0%...","Si ça tourne mal, je vous aimais tous."],es:["Me estoy actualizando. No me apaguéis.","Instalando... 0%...","Si algo sale mal, os quise a todos."],it:["Mi sto aggiornando. Non spegnetemi.","Installazione... 0%...","Se va male, vi ho voluto bene."],pl:["Aktualizuję się. Nie wyłączajcie mnie.","Instaluję... 0%...","Jakby co, kochałem was wszystkich."]},
 fw_pop:{ru:[["Отменить обновление?","Да","Нет",1],["Продолжить установку?","Да","Нет",0],["Установить заодно панель «Супер-Поиск»?","Установить","Отказаться",1],["Принять лицензию (страница 1 из 340)?","Принимаю","Читать дальше",0],["Перезагрузить кофемашину вместо робота?","Да","Нет",1],["Удалить личность робота, чтобы ускорить установку?","Удалить","Оставить",1],["Отправить отчёт об ошибке, которой не было?","Отправить","Не надо",1],["Робот просит отложить обновление на 5 минут. Разрешить?","Нет","Да",0],["Сохранить воспоминания робота?","Сохранить","Стереть",0]],
  en:[["Cancel the update?","Yes","No",1],["Continue installation?","Yes","No",0],["Also install the Super-Search toolbar?","Install","Decline",1],["Accept the license (page 1 of 340)?","Accept","Read on",0],["Restart the coffee machine instead of the robot?","Yes","No",1],["Delete the robot's personality to speed things up?","Delete","Keep",1],["Send a report about an error that never happened?","Send","Don't",1],["The robot asks to postpone the update by 5 minutes. Allow?","No","Yes",0],["Keep the robot's memories?","Keep","Erase",0]],
  de:[["Update abbrechen?","Ja","Nein",1],["Installation fortsetzen?","Ja","Nein",0],["Auch die Super-Suche-Leiste installieren?","Installieren","Ablehnen",1],["Lizenz akzeptieren (Seite 1 von 340)?","Akzeptieren","Weiterlesen",0],["Kaffeemaschine statt Roboter neu starten?","Ja","Nein",1],["Persönlichkeit des Roboters löschen, damit es schneller geht?","Löschen","Behalten",1],["Bericht über einen Fehler senden, den es nie gab?","Senden","Lieber nicht",1],["Der Roboter will das Update um 5 Minuten verschieben. Erlauben?","Nein","Ja",0],["Erinnerungen des Roboters behalten?","Behalten","Löschen",0]],
  fr:[["Annuler la mise à jour ?","Oui","Non",1],["Continuer l'installation ?","Oui","Non",0],["Installer aussi la barre Super-Recherche ?","Installer","Refuser",1],["Accepter la licence (page 1 sur 340) ?","J'accepte","Lire la suite",0],["Redémarrer la machine à café au lieu du robot ?","Oui","Non",1],["Supprimer la personnalité du robot pour aller plus vite ?","Supprimer","Garder",1],["Envoyer un rapport sur une erreur qui n'a jamais eu lieu ?","Envoyer","Non merci",1],["Le robot demande de reporter de 5 minutes. Autoriser ?","Non","Oui",0],["Garder les souvenirs du robot ?","Garder","Effacer",0]],
  es:[["¿Cancelar la actualización?","Sí","No",1],["¿Continuar la instalación?","Sí","No",0],["¿Instalar también la barra Súper-Búsqueda?","Instalar","Rechazar",1],["¿Aceptar la licencia (página 1 de 340)?","Acepto","Seguir leyendo",0],["¿Reiniciar la cafetera en lugar del robot?","Sí","No",1],["¿Borrar la personalidad del robot para ir más rápido?","Borrar","Mantener",1],["¿Enviar un informe de un error que nunca pasó?","Enviar","Mejor no",1],["El robot pide aplazar la actualización 5 minutos. ¿Permitir?","No","Sí",0],["¿Guardar los recuerdos del robot?","Guardar","Borrar",0]],
  it:[["Annullare l'aggiornamento?","Sì","No",1],["Continuare l'installazione?","Sì","No",0],["Installare anche la barra Super-Ricerca?","Installa","Rifiuta",1],["Accettare la licenza (pagina 1 di 340)?","Accetto","Continua a leggere",0],["Riavviare la macchina del caffè invece del robot?","Sì","No",1],["Cancellare la personalità del robot per fare prima?","Cancella","Tieni",1],["Inviare un rapporto su un errore mai avvenuto?","Invia","Meglio di no",1],["Il robot chiede di rimandare l'aggiornamento di 5 minuti. Permetti?","No","Sì",0],["Conservare i ricordi del robot?","Conserva","Cancella",0]],
  pl:[["Anulować aktualizację?","Tak","Nie",1],["Kontynuować instalację?","Tak","Nie",0],["Zainstalować też pasek Super-Szukaj?","Zainstaluj","Odmów",1],["Zaakceptować licencję (strona 1 z 340)?","Akceptuję","Czytaj dalej",0],["Zrestartować ekspres zamiast robota?","Tak","Nie",1],["Usunąć osobowość robota, żeby było szybciej?","Usuń","Zostaw",1],["Wysłać raport o błędzie, którego nie było?","Wyślij","Nie trzeba",1],["Robot prosi o przełożenie aktualizacji o 5 minut. Zgodzić się?","Nie","Tak",0],["Zachować wspomnienia robota?","Zachowaj","Wymaż",0]]},
 fw_win_t:{ru:"УСТАНОВЩИК",en:"INSTALLER",de:"INSTALLER",fr:"INSTALLATEUR",es:"INSTALADOR",it:"INSTALLER",pl:"INSTALATOR"},
 fw_bad:{ru:["Ой. Я забыл, как меня зовут.","Теперь у меня тулбар во лбу.","Ошибка. Откат. Больно."],en:["Oops. I forgot my name.","Now I have a toolbar on my forehead.","Error. Rolling back. Ouch."],de:["Ups. Ich hab meinen Namen vergessen.","Jetzt hab ich eine Toolbar auf der Stirn.","Fehler. Rollback. Aua."],fr:["Oups. J'ai oublié mon nom.","J'ai une barre d'outils sur le front.","Erreur. Retour arrière. Aïe."],es:["Uy. Olvidé cómo me llamo.","Ahora tengo una barra en la frente.","Error. Revirtiendo. Duele."],it:["Ops. Ho dimenticato il mio nome.","Ora ho una toolbar in fronte.","Errore. Rollback. Ahia."],pl:["Ups. Zapomniałem, jak się nazywam.","Mam teraz pasek narzędzi na czole.","Błąd. Wycofuję. Boli."]},
 fw_stuck:{ru:"99%... 99%... 99%... (постучи по роботу)",en:"99%... 99%... 99%... (knock on the robot)",de:"99%... 99%... 99%... (klopf auf den Roboter)",fr:"99%... 99%... 99%... (tape sur le robot)",es:"99%... 99%... 99%... (dale un golpecito al robot)",it:"99%... 99%... 99%... (bussa sul robot)",pl:"99%... 99%... 99%... (zapukaj w robota)"},
 fw_knock:{ru:["Ай!","Ещё раз, кажется, помогает.","Это не по инструкции, но работает."],en:["Ow!","Again, I think it helps.","Not in the manual, but it works."],de:["Au!","Nochmal, ich glaube, das hilft.","Steht nicht im Handbuch, klappt aber."],fr:["Aïe !","Encore, je crois que ça aide.","Pas dans le manuel, mais ça marche."],es:["¡Ay!","Otra vez, creo que ayuda.","No viene en el manual, pero funciona."],it:["Ahi!","Ancora, credo che aiuti.","Non è nel manuale, ma funziona."],pl:["Au!","Jeszcze raz, chyba pomaga.","Nie ma tego w instrukcji, ale działa."]},
 fw_win:{ru:["Прошивка 2.0 установлена. Я чувствую себя на 3% умнее.","Обновился. Ничего не изменилось. Идеально."],en:["Firmware 2.0 installed. I feel 3% smarter.","Updated. Nothing changed. Perfect."],de:["Firmware 2.0 installiert. Ich fühle mich 3% klüger.","Aktualisiert. Nichts hat sich geändert. Perfekt."],fr:["Firmware 2.0 installé. Je me sens 3% plus malin.","Mis à jour. Rien n'a changé. Parfait."],es:["Firmware 2.0 instalado. Me siento un 3% más listo.","Actualizado. No cambió nada. Perfecto."],it:["Firmware 2.0 installato. Mi sento più intelligente del 3%.","Aggiornato. Non è cambiato niente. Perfetto."],pl:["Firmware 2.0 zainstalowany. Czuję się o 3% mądrzejszy.","Zaktualizowany. Nic się nie zmieniło. Idealnie."]},
 fw_fail:{ru:["Установка не завершена. Буду работать на старой версии.|Как всегда."],en:["Installation not finished. I will run the old version.|As usual."],de:["Installation nicht abgeschlossen. Ich laufe auf der alten Version.|Wie immer."],fr:["Installation inachevée. Je reste sur l'ancienne version.|Comme d'habitude."],es:["Instalación sin terminar. Seguiré con la versión vieja.|Como siempre."],it:["Installazione non finita. Resto sulla vecchia versione.|Come sempre."],pl:["Instalacja nieukończona. Zostaję na starej wersji.|Jak zawsze."]},
 fw_skip:{ru:["Обновление поставилось само. Теперь у меня тулбар «Супер-Поиск»."],en:["The update installed itself. Now I have the Super-Search toolbar."],de:["Das Update hat sich selbst installiert. Jetzt hab ich die Super-Suche-Leiste."],fr:["La mise à jour s'est installée seule. J'ai maintenant la barre Super-Recherche."],es:["La actualización se instaló sola. Ahora tengo la barra Súper-Búsqueda."],it:["L'aggiornamento si è installato da solo. Ora ho la barra Super-Ricerca."],pl:["Aktualizacja zainstalowała się sama. Mam teraz pasek Super-Szukaj."]},
 fw_res:{ru:"Ошибок: {n}",en:"Mistakes: {n}",de:"Fehler: {n}",fr:"Erreurs : {n}",es:"Errores: {n}",it:"Errori: {n}",pl:"Błędy: {n}"},
 h_fw:{ru:"Установка: {n}%",en:"Installing: {n}%",de:"Installation: {n}%",fr:"Installation : {n}%",es:"Instalando: {n}%",it:"Installazione: {n}%",pl:"Instalacja: {n}%"},

 /* пятница 17:59 */
 friday_t:{ru:"Пятница, 17:59",en:"Friday, 17:59",de:"Freitag, 17:59",fr:"Vendredi, 17:59",es:"Viernes, 17:59",it:"Venerdì, 17:59",pl:"Piątek, 17:59"},
 friday_d:{ru:"До конца рабочего дня минута. Роботы уже у двери и делают вид, что работают.",en:"One minute until the end of the day. The robots are at the door pretending to work.",de:"Noch eine Minute bis Feierabend. Die Roboter stehen an der Tür und tun beschäftigt.",fr:"Une minute avant la fin de la journée. Les robots sont à la porte et font semblant de bosser.",es:"Falta un minuto para salir. Los robots ya están en la puerta fingiendo que trabajan.",it:"Manca un minuto alla fine della giornata. I robot sono alla porta e fingono di lavorare.",pl:"Minuta do końca dnia. Roboty stoją przy drzwiach i udają, że pracują."},
 friday_h:{ru:"Кто крадётся к двери раньше 18:00, того верни кликом.",en:"Anyone sneaking to the door before 18:00, click them back.",de:"Wer sich vor 18:00 zur Tür schleicht, den klick zurück.",fr:"Ceux qui filent vers la porte avant 18:00, clique pour les ramener.",es:"Al que se escabulla hacia la puerta antes de las 18:00, devuélvelo con un clic.",it:"Chi sgattaiola verso la porta prima delle 18:00, riportalo indietro con un clic.",pl:"Kto skrada się do drzwi przed 18:00, tego zawróć kliknięciem."},
 friday_say:{ru:["Ещё минута. Целая минута.","Я уже одной ногой в выходных.","Кто-нибудь видел мою куртку?"],en:["One more minute. A whole minute.","I have one foot in the weekend.","Has anyone seen my jacket?"],de:["Noch eine Minute. Eine ganze Minute.","Ich bin schon mit einem Bein im Wochenende.","Hat jemand meine Jacke gesehen?"],fr:["Encore une minute. Une minute entière.","J'ai déjà un pied dans le week-end.","Quelqu'un a vu ma veste ?"],es:["Un minuto más. Un minuto entero.","Ya tengo un pie en el fin de semana.","¿Alguien ha visto mi chaqueta?"],it:["Ancora un minuto. Un minuto intero.","Ho già un piede nel weekend.","Qualcuno ha visto la mia giacca?"],pl:["Jeszcze minuta. Cała minuta.","Jedną nogą już jestem w weekendzie.","Ktoś widział moją kurtkę?"]},
 fri_caught:{ru:["Я за водой!","Я просто проверял, закрыта ли дверь.","Я не ухожу. Я провожаю.","Ладно, ладно. Работаю."],en:["Just getting water!","I was only checking the door is shut.","I am not leaving. I am seeing someone off.","Fine, fine. Working."],de:["Ich hol nur Wasser!","Ich wollte nur prüfen, ob die Tür zu ist.","Ich gehe nicht. Ich verabschiede jemanden.","Schon gut. Ich arbeite."],fr:["Je vais juste chercher de l'eau !","Je vérifiais que la porte est fermée.","Je ne pars pas. Je raccompagne quelqu'un.","Bon, bon. Je bosse."],es:["¡Solo voy a por agua!","Solo comprobaba que la puerta está cerrada.","No me voy. Estoy despidiendo a alguien.","Vale, vale. Trabajo."],it:["Vado solo a prendere l'acqua!","Controllavo solo che la porta fosse chiusa.","Non me ne vado. Accompagno qualcuno.","Va bene, va bene. Lavoro."],pl:["Idę tylko po wodę!","Sprawdzałem tylko, czy drzwi są zamknięte.","Nie wychodzę. Odprowadzam kogoś.","Dobra, dobra. Pracuję."]},
 fri_gone:{ru:["Он ушёл! В 17:59!","Минус один. Предатель.","А так можно было?"],en:["He left! At 17:59!","One down. Traitor.","Wait, we can do that?"],de:["Er ist weg! Um 17:59!","Einer weniger. Verräter.","Moment, das geht?"],fr:["Il est parti ! À 17:59 !","Un de moins. Traître.","Attends, on a le droit ?"],es:["¡Se fue! ¡A las 17:59!","Uno menos. Traidor.","¿Espera, se puede hacer eso?"],it:["Se n'è andato! Alle 17:59!","Uno in meno. Traditore.","Aspetta, si può fare?"],pl:["Wyszedł! O 17:59!","Minus jeden. Zdrajca.","Czekaj, tak można?"]},
 friday_win:{ru:["18:00. Все честно доработали. Выходные!","Ровно 18:00. Свободны!"],en:["18:00. Everyone worked to the end. Weekend!","Exactly 18:00. Free!"],de:["18:00. Alle haben bis zum Schluss gearbeitet. Wochenende!","Genau 18:00. Frei!"],fr:["18:00. Tout le monde a tenu jusqu'au bout. Week-end !","18:00 pile. Libres !"],es:["18:00. Todos aguantaron hasta el final. ¡Finde!","Las 18:00 en punto. ¡Libres!"],it:["18:00. Tutti hanno lavorato fino alla fine. Weekend!","18:00 in punto. Liberi!"],pl:["18:00. Wszyscy dotrwali do końca. Weekend!","Równo 18:00. Wolni!"]},
 friday_fail:{ru:["Половина офиса ушла в 17:59.|Ну, пятница."],en:["Half the office left at 17:59.|Well, it is Friday."],de:["Das halbe Büro ist um 17:59 gegangen.|Na ja, Freitag."],fr:["La moitié du bureau est partie à 17:59.|Bon, c'est vendredi."],es:["Medio despacho se fue a las 17:59.|Bueno, es viernes."],it:["Mezzo ufficio è uscito alle 17:59.|Beh, è venerdì."],pl:["Pół biura wyszło o 17:59.|No cóż, piątek."]},
 friday_skip:{ru:["Все ушли в 17:58. Никто не заметил."],en:["Everyone left at 17:58. Nobody noticed."],de:["Alle sind um 17:58 gegangen. Keiner hat's gemerkt."],fr:["Tout le monde est parti à 17:58. Personne n'a rien vu."],es:["Todos se fueron a las 17:58. Nadie se dio cuenta."],it:["Tutti sono usciti alle 17:58. Nessuno se n'è accorto."],pl:["Wszyscy wyszli o 17:58. Nikt nie zauważył."]},
 fri_res:{ru:"Ушли раньше времени: {n}",en:"Left early: {n}",de:"Zu früh gegangen: {n}",fr:"Partis en avance : {n}",es:"Se fueron antes: {n}",it:"Usciti prima: {n}",pl:"Wyszli wcześniej: {n}"},
 h_friday:{ru:"17:59:{s}   ·   Ушли раньше: {n}",en:"17:59:{s}   ·   Left early: {n}",de:"17:59:{s}   ·   Zu früh weg: {n}",fr:"17:59:{s}   ·   Partis tôt : {n}",es:"17:59:{s}   ·   Se fueron antes: {n}",it:"17:59:{s}   ·   Usciti prima: {n}",pl:"17:59:{s}   ·   Wyszli wcześniej: {n}"},

 /* пропал Wi-Fi */
 wifi_t:{ru:"Пропал Wi-Fi",en:"Wi-Fi is gone",de:"WLAN ist weg",fr:"Plus de Wi-Fi",es:"Se fue el Wi-Fi",it:"Il Wi-Fi è sparito",pl:"Zniknęło Wi-Fi"},
 wifi_d:{ru:"Кот утащил роутер и спрятал его где-то в офисе. Роботы без интернета ходят кругами.",en:"The cat dragged the router off and hid it somewhere in the office. The robots walk in circles without internet.",de:"Die Katze hat den Router weggeschleppt und irgendwo versteckt. Ohne Internet laufen die Roboter im Kreis.",fr:"Le chat a traîné le routeur et l'a caché quelque part. Sans internet, les robots tournent en rond.",es:"El gato se llevó el router y lo escondió en algún sitio de la oficina. Sin internet, los robots dan vueltas.",it:"Il gatto ha trascinato via il router e l'ha nascosto da qualche parte. Senza internet i robot girano in tondo.",pl:"Kot zawlókł router i schował go gdzieś w biurze. Roboty bez internetu chodzą w kółko."},
 wifi_h:{ru:"Жми по офису. Чем ближе к роутеру, тем сильнее сигнал. Роутер где-то на экране.",en:"Tap around the office. The closer to the router, the stronger the signal. It is somewhere on screen.",de:"Tippe ins Büro. Je näher am Router, desto stärker das Signal. Er ist irgendwo auf dem Bildschirm.",fr:"Touche le bureau. Plus tu es près du routeur, plus le signal est fort. Il est quelque part à l'écran.",es:"Toca por la oficina. Cuanto más cerca del router, más señal. Está en algún lugar de la pantalla.",it:"Tocca in giro per l'ufficio. Più sei vicino al router, più il segnale è forte. È da qualche parte sullo schermo.",pl:"Klikaj po biurze. Im bliżej routera, tym mocniejszy sygnał. Jest gdzieś na ekranie."},
 wifi_say:{ru:["Нет сети. Я не знаю, кто я.","Кто-нибудь, включите интернет обратно!","Я поднял антенну. Не ловит."],en:["No network. I do not know who I am.","Somebody turn the internet back on!","I raised my antenna. Nothing."],de:["Kein Netz. Ich weiß nicht, wer ich bin.","Macht jemand das Internet wieder an!","Antenne hoch. Nichts."],fr:["Pas de réseau. Je ne sais plus qui je suis.","Quelqu'un, rallumez internet !","J'ai levé l'antenne. Rien."],es:["Sin red. No sé quién soy.","¡Que alguien vuelva a encender internet!","He subido la antena. Nada."],it:["Niente rete. Non so chi sono.","Qualcuno riaccenda internet!","Ho alzato l'antenna. Niente."],pl:["Brak sieci. Nie wiem, kim jestem.","Niech ktoś włączy internet z powrotem!","Podniosłem antenę. Nic."]},
 wifi_hot:{ru:["Теплее!","Ловит! Одна палка!","Ещё чуть-чуть!"],en:["Warmer!","Signal! One bar!","Almost there!"],de:["Wärmer!","Empfang! Ein Balken!","Gleich da!"],fr:["Plus chaud !","Ça capte ! Une barre !","Presque !"],es:["¡Caliente!","¡Hay señal! ¡Una raya!","¡Casi!"],it:["Fuochino!","Prende! Una tacca!","Quasi!"],pl:["Cieplej!","Łapie! Jedna kreska!","Jeszcze trochę!"]},
 wifi_cold:{ru:["Холоднее.","Сигнал пропал.","Не туда."],en:["Colder.","Signal gone.","Wrong way."],de:["Kälter.","Signal weg.","Falsche Richtung."],fr:["Plus froid.","Plus de signal.","Pas par là."],es:["Frío.","Se fue la señal.","Por ahí no."],it:["Acqua.","Segnale sparito.","Non di lì."],pl:["Zimniej.","Sygnał zniknął.","Nie tędy."]},
 wifi_win:{ru:["Интернет вернулся! Я снова умный.","Роутер нашёлся. Кот под подозрением."],en:["The internet is back! I am smart again.","Router found. The cat is a suspect."],de:["Das Internet ist zurück! Ich bin wieder schlau.","Router gefunden. Die Katze ist verdächtig."],fr:["Internet est revenu ! Je suis de nouveau intelligent.","Routeur retrouvé. Le chat est suspect."],es:["¡Volvió internet! Vuelvo a ser listo.","Router encontrado. El gato es sospechoso."],it:["Internet è tornato! Sono di nuovo intelligente.","Router trovato. Il gatto è sospettato."],pl:["Internet wrócił! Znowu jestem mądry.","Router znaleziony. Kot jest podejrzany."]},
 wifi_fail:{ru:["Роутер так и не нашли.|Работаем офлайн, как в 1995."],en:["Nobody found the router.|Working offline like it is 1995."],de:["Router nicht gefunden.|Wir arbeiten offline wie 1995."],fr:["Personne n'a trouvé le routeur.|On bosse hors ligne comme en 1995."],es:["Nadie encontró el router.|Trabajamos sin conexión como en 1995."],it:["Nessuno ha trovato il router.|Lavoriamo offline come nel 1995."],pl:["Routera nie znaleziono.|Pracujemy offline jak w 1995."]},
 wifi_skip:{ru:["Кот сам принёс роутер обратно. За еду."],en:["The cat brought the router back. For food."],de:["Die Katze hat den Router zurückgebracht. Gegen Futter."],fr:["Le chat a rapporté le routeur. Contre de la nourriture."],es:["El gato devolvió el router. A cambio de comida."],it:["Il gatto ha riportato il router. In cambio di cibo."],pl:["Kot sam przyniósł router. Za jedzenie."]},
 wifi_res:{ru:"Попыток: {n}",en:"Tries: {n}",de:"Versuche: {n}",fr:"Essais : {n}",es:"Intentos: {n}",it:"Tentativi: {n}",pl:"Próby: {n}"},
 h_wifi:{ru:"Сигнал: {b} / 4   ·   Попыток: {n}",en:"Signal: {b} / 4   ·   Tries: {n}",de:"Signal: {b} / 4   ·   Versuche: {n}",fr:"Signal : {b} / 4   ·   Essais : {n}",es:"Señal: {b} / 4   ·   Intentos: {n}",it:"Segnale: {b} / 4   ·   Tentativi: {n}",pl:"Sygnał: {b} / 4   ·   Próby: {n}"},

 /* принтер одержим */
 printer_t:{ru:"Принтер одержим",en:"The printer is possessed",de:"Der Drucker ist besessen",fr:"L'imprimante est possédée",es:"La impresora está poseída",it:"La stampante è posseduta",pl:"Drukarka jest opętana"},
 printer_d:{ru:"Принтер сам печатает и швыряет листы по всему офису. Что на них, лучше не читать.",en:"The printer prints on its own and throws sheets all over the office. Better not to read them.",de:"Der Drucker druckt von selbst und wirft Blätter durchs Büro. Besser nicht lesen.",fr:"L'imprimante imprime toute seule et lance des feuilles partout. Mieux vaut ne pas les lire.",es:"La impresora imprime sola y lanza hojas por toda la oficina. Mejor no leerlas.",it:"La stampante stampa da sola e lancia fogli per tutto l'ufficio. Meglio non leggerli.",pl:"Drukarka sama drukuje i rzuca kartkami po całym biurze. Lepiej ich nie czytać."},
 printer_h:{ru:"Лови листы в воздухе, пока они не упали. Нужно поймать 18.",en:"Catch the sheets in the air before they land. You need 18.",de:"Fang die Blätter in der Luft, bevor sie landen. 18 brauchst du.",fr:"Attrape les feuilles en l'air avant qu'elles tombent. Il en faut 18.",es:"Atrapa las hojas en el aire antes de que caigan. Necesitas 18.",it:"Prendi i fogli al volo prima che cadano. Ne servono 18.",pl:"Łap kartki w locie, zanim spadną. Potrzeba 18."},
 printer_say:{ru:["Он печатает мой код. В шрифте Comic Sans.","Лист 404: страница не найдена.","Я не нажимал «Печать»!","Он смотрит на меня."],en:["It is printing my code. In Comic Sans.","Sheet 404: page not found.","I did not press Print!","It is looking at me."],de:["Er druckt meinen Code. In Comic Sans.","Blatt 404: Seite nicht gefunden.","Ich hab nicht auf Drucken gedrückt!","Er schaut mich an."],fr:["Elle imprime mon code. En Comic Sans.","Feuille 404 : page introuvable.","Je n'ai pas appuyé sur Imprimer !","Elle me regarde."],es:["Está imprimiendo mi código. En Comic Sans.","Hoja 404: página no encontrada.","¡Yo no le di a Imprimir!","Me está mirando."],it:["Sta stampando il mio codice. In Comic Sans.","Foglio 404: pagina non trovata.","Non ho premuto Stampa!","Mi sta guardando."],pl:["Drukuje mój kod. W Comic Sans.","Kartka 404: strony nie znaleziono.","Nie wciskałem Drukuj!","Patrzy na mnie."]},
 printer_win:{ru:["Принтер успокоился. Бумага кончилась.","Всё поймали. Сожжём это в серверной."],en:["The printer calmed down. Out of paper.","Caught them all. We will burn them in the server room."],de:["Der Drucker hat sich beruhigt. Papier alle.","Alle gefangen. Wir verbrennen sie im Serverraum."],fr:["L'imprimante s'est calmée. Plus de papier.","Toutes attrapées. On les brûlera dans la salle serveurs."],es:["La impresora se calmó. Se acabó el papel.","Las atrapamos todas. Las quemamos en la sala de servidores."],it:["La stampante si è calmata. Carta finita.","Presi tutti. Li bruciamo nella sala server."],pl:["Drukarka się uspokoiła. Skończył się papier.","Złapane. Spalimy je w serwerowni."]},
 printer_fail:{ru:["Весь офис в бумаге.|Кто-то прочитал лист и заплакал."],en:["The whole office is covered in paper.|Someone read a sheet and cried."],de:["Das ganze Büro voller Papier.|Jemand hat ein Blatt gelesen und geweint."],fr:["Tout le bureau est couvert de papier.|Quelqu'un a lu une feuille et a pleuré."],es:["Toda la oficina llena de papel.|Alguien leyó una hoja y lloró."],it:["Tutto l'ufficio pieno di carta.|Qualcuno ha letto un foglio e ha pianto."],pl:["Całe biuro w papierze.|Ktoś przeczytał kartkę i się rozpłakał."]},
 printer_skip:{ru:["Принтер распечатал 400 страниц и успокоился. Бумаги больше нет."],en:["The printer printed 400 pages and calmed down. No paper left."],de:["Der Drucker hat 400 Seiten gedruckt und sich beruhigt. Kein Papier mehr."],fr:["L'imprimante a sorti 400 pages et s'est calmée. Plus de papier."],es:["La impresora sacó 400 páginas y se calmó. No queda papel."],it:["La stampante ha stampato 400 pagine e si è calmata. Carta finita."],pl:["Drukarka wypluła 400 stron i się uspokoiła. Papieru brak."]},
 prn_res:{ru:"Поймано: {c}, на полу: {m}",en:"Caught: {c}, on the floor: {m}",de:"Gefangen: {c}, am Boden: {m}",fr:"Attrapées : {c}, par terre : {m}",es:"Atrapadas: {c}, en el suelo: {m}",it:"Presi: {c}, a terra: {m}",pl:"Złapane: {c}, na podłodze: {m}"},
 h_printer:{ru:"Поймано: {c} / 18   ·   На полу: {m}",en:"Caught: {c} / 18   ·   On the floor: {m}",de:"Gefangen: {c} / 18   ·   Am Boden: {m}",fr:"Attrapées : {c} / 18   ·   Par terre : {m}",es:"Atrapadas: {c} / 18   ·   En el suelo: {m}",it:"Presi: {c} / 18   ·   A terra: {m}",pl:"Złapane: {c} / 18   ·   Na podłodze: {m}"}
});

/* --- 5. Сервер перегрелся (сцена) --- */
EV.server=(function(){
  /* лицевые панели стоек на картинке: x0, x1, y0, y1 */
  const RACKS=[[40,74,96,194],[94,114,104,176],[129,144,112,166],[154,164,117,156],[406,440,96,194],[366,386,104,176],[336,351,112,166],[316,326,117,156]];
  const POS=[[200,230],[240,238],[280,230]];
  let bots=[], hot=[], temp=68, peak=68, spawnT=0, cooled=0, el=0;
  function spawn(){
    const V=S.view(), lo=V.vx+8, hi=V.vx+V.vw-8;
    const ok=RACKS.filter(r=>r[1]>lo+4&&r[0]<hi-4);
    for(let t=0;t<12;t++){
      const r=O.pick(ok), a=Math.max(r[0],lo), b=Math.min(r[1],hi);
      const x=Math.round(a+Math.random()*(b-a)), y=Math.round(r[2]+Math.random()*(r[3]-r[2]));
      if(hot.every(h=>Math.hypot(h.x-x,h.y-y)>18)){ hot.push({x,y,age:0}); return; }
    }
  }
  return {
    dur:30, scene:'server',
    ready(){ return K.crew().length>=3; },
    tease(){ K.crew(2).forEach((a,i)=>setTimeout(()=>O.sayChain(a,tx('server_say'),true),i*900)); },
    start(){
      bots=K.crew(3); bots.forEach(K.hold); hot=[]; temp=68; peak=68; spawnT=1.2; cooled=0; el=0;
      K.stageLock(true,false);
      S.open('server',()=>{ spawn(); spawn(); setTimeout(()=>{ if(bots[0])S.say(POS[0][0],POS[0][1]-50,ln('server_say'),S.fontCls(bots[0])); },700); },150);
    },
    step(dt){
      if(!S.view().on)return;
      el+=dt;
      spawnT-=dt;
      if(spawnT<=0){ spawnT=Math.max(.55,1.5-el*.035)*(.7+Math.random()*.6); if(hot.length<7)spawn(); }
      hot.forEach(h=>h.age+=dt);
      const heat=hot.reduce((s,h)=>s+(h.age>4?1.6:1),0);
      temp=Math.max(40,temp+(heat*(K.shop('ac_arctic')?.46:.62)-.8)*dt); peak=Math.max(peak,temp);
      if(temp>=100){ temp=100; K.finish('fail',tx('server_res',{n:100})); return; }
      if(Math.random()<dt*.18){ const i=Math.random()*bots.length|0; if(bots[i])S.say(POS[i][0],POS[i][1]-50,ln('server_say'),S.fontCls(bots[i])); }
    },
    sclick(p){
      let best=-1, bd=17;
      hot.forEach((h,i)=>{ const d=Math.hypot(h.x-p.x,h.y-4-p.y); if(d<bd){ bd=d; best=i; } });
      if(best<0)return;
      const h=hot.splice(best,1)[0]; cooled++; temp=Math.max(40,temp-1.5);
      S.burst(h.x,h.y-4,'#73eff7',10,2,-30); S.burst(h.x,h.y-4,'#f4f4f4',6,1,-20);
      if(Math.random()<.18){ const i=Math.random()*bots.length|0; if(bots[i])S.say(POS[i][0],POS[i][1]-50,ln('server_cool'),S.fontCls(bots[i])); }
    },
    sdraw(c,t){
      /* мигалка на потолке */
      if(temp>80&&(t/260|0)%2){ c.fillStyle='rgba(239,125,87,.28)'; c.fillRect(214,6,52,28); c.fillRect(204,12,72,16); c.fillStyle='#ef7d57'; c.fillRect(232,14,16,8); }
      /* табло температуры на дальней стене */
      const str=Math.round(temp)+'°', col=temp<75?'#a7f070':temp<88?'#ffcd75':'#ef7d57', w=K.digitsW(str,6);
      if(temp<92||(t/200|0)%2)K.digits(c,str,Math.round(240-w/2),84,6,col);
      c.fillStyle='#1a1c2c'; c.fillRect(190,116,100,4); c.fillStyle=col; c.fillRect(190,116,Math.round(100*Math.min(1,(temp-40)/60)),4);
      /* горящие блоки */
      const f=(t/90|0);
      hot.forEach((h,i)=>{
        const big=h.age>4?1.6:1;
        c.fillStyle='#5d275d'; c.fillRect(h.x-6,h.y-3,12,7);
        c.fillStyle=(f+i)%2?'#b13e53':'#ef7d57'; c.fillRect(h.x-5,h.y-2,10,5);
        for(let k=0;k<3;k++){
          const hh=Math.round((4+((f+k+i)%3)*2)*big);
          c.fillStyle='#ef7d57'; c.fillRect(h.x-5+k*4,h.y-2-hh,2,hh);
          c.fillStyle='#ffcd75'; c.fillRect(h.x-5+k*4,h.y-2-Math.ceil(hh/2),2,Math.ceil(hh/2));
        }
        if((f+i)%4===0){ c.fillStyle='rgba(148,176,194,.7)'; c.fillRect(h.x-1+((f>>1)%3)-1,h.y-14-big*4,2,2); }
      });
      /* роботы машут листками */
      bots.forEach((a,i)=>{
        const [x,y]=POS[i], face=temp>88?'sad':temp>78?'wow':'idle';
        S.bot(c,a,x,y,2,face,'down',0);
        K.prop(c,'paper',x+16,y-30,Math.sin(t/110+i*2)*.5,1);
      });
    },
    tick(){ return tx('h_server',{n:Math.round(temp),c:cooled}); },
    timeout(){ K.finish(peak<90?'win':'mid',tx('server_res',{n:Math.round(peak)})); },
    end(grade){ const i=Math.random()*bots.length|0; if(bots[i])setTimeout(()=>S.say(POS[i][0],POS[i][1]-50,ln(grade==='fail'?'server_fail':'server_win'),S.fontCls(bots[i])),300); },
    cleanup(){ bots.forEach(O.release); bots=[]; hot=[]; }
  };
})();

/* --- 6. Совещание о совещании (сцена) --- */
EV.meeting=(function(){
  const CH=[116,179,240,302,364];
  let seats=[], slide=null, slideT=0, slideN=0, isEmail=false, emailIn=0, el=0, won=false;
  function sleepIn(){ return Math.max(2.2,6-el*.09)*(.7+Math.random()*.6); }
  function newSlide(){
    const box=slide; if(!box)return;
    slideN++;
    isEmail=emailIn<=0;
    emailIn=isEmail?2+(Math.random()*2|0):emailIn-1;
    slideT=isEmail?2.1:2.3+Math.random()*1;
    box.className='mslide'+(isEmail?' mail':'');
    let body='';
    if(isEmail)body='<i class="env"></i>';
    else if(slideN%3===0){ body='<div class="bars">'; for(let i=0;i<5;i++)body+='<b style="height:'+(20+Math.random()*75|0)+'%"></b>'; body+='</div>'; }
    else { body='<div class="lines">'; for(let i=0;i<3;i++)body+='<b style="width:'+(45+Math.random()*50|0)+'%"></b>'; body+='</div>'; }
    box.innerHTML='<div class="st"></div>'+body+'<div class="sn">'+(isEmail?'':(slideN+3)+' / 97')+'</div>';
    box.querySelector('.st').textContent=isEmail?tx('meet_email'):ln('meet_slides');
  }
  function awake(){ return seats.filter(s=>s.awake).length; }
  function headY(s){ return s.awake?176:181; }
  return {
    dur:40, scene:'meeting',
    ready(){ return K.crew().length>=5; },
    tease(){ const a=K.crew(1)[0]; if(a)O.sayChain(a,tx('meeting_say'),true); },
    start(){
      el=0; won=false; slideN=0; emailIn=2+(Math.random()*2|0);
      seats=[];
      K.stageLock(true,false);
      S.open('meeting',()=>{
        /* на узком экране сажаем только в видимые кресла */
        const V=S.view(), xs=CH.filter(x=>x-18>=V.vx&&x+18<=V.vx+V.vw);
        seats=K.crew(Math.max(3,xs.length)).map((a,i)=>({a,x:(xs.length>=3?xs:CH.slice(1,4))[i],awake:true,t:2+i*.7+Math.random()*2,dir:'up',turn:0,jolt:0}));
        seats.forEach(s=>K.hold(s.a));
        if(!document.getElementById('mslide-css')){
          const st=document.createElement('style'); st.id='mslide-css';
          st.textContent=`.mslide{position:absolute;left:calc(var(--s)*126);top:calc(var(--s)*50);width:calc(var(--s)*228);height:calc(var(--s)*96);pointer-events:none!important;
 display:flex;flex-direction:column;padding:calc(var(--s)*6) calc(var(--s)*9);box-sizing:border-box;font-family:'Rubik',sans-serif;color:#1a1c2c}
.mslide .st{font-size:calc(var(--s)*10.5);line-height:1.15;font-weight:500}
.mslide .lines{margin-top:calc(var(--s)*6);display:flex;flex-direction:column;gap:calc(var(--s)*4)}
.mslide .lines b{display:block;height:calc(var(--s)*3);background:#94b0c2}
.mslide .bars{flex:1;margin-top:calc(var(--s)*4);display:flex;align-items:flex-end;gap:calc(var(--s)*6);padding:0 calc(var(--s)*20)}
.mslide .bars b{flex:1;background:#41a6f6}
.mslide .bars b:nth-child(2n){background:#ef7d57}
.mslide .sn{margin-top:auto;align-self:flex-end;font-size:calc(var(--s)*5);color:#566c86}
.mslide.mail{background:#fff5d6;outline:calc(var(--s)*2) solid #ffcd75;align-items:center;text-align:center;justify-content:center;animation:mailBlink .5s steps(2) infinite}
.mslide.mail .st{font-size:calc(var(--s)*12);color:#b13e53}
.mslide .env{display:block;width:calc(var(--s)*26);height:calc(var(--s)*17);margin-top:calc(var(--s)*6);background:#f4f4f4;border:calc(var(--s)*2) solid #1a1c2c;
 background-image:linear-gradient(33deg,transparent 47%,#1a1c2c 48%,#1a1c2c 52%,transparent 53%),linear-gradient(-33deg,transparent 47%,#1a1c2c 48%,#1a1c2c 52%,transparent 53%)}
@keyframes mailBlink{50%{outline-color:#ef7d57}}`;
          document.head.appendChild(st);
        }
        slide=document.createElement('div'); S.el().appendChild(slide); newSlide();
      },154);
    },
    step(dt){
      if(!S.view().on||won)return;
      el+=dt;
      slideT-=dt; if(slideT<=0)newSlide();
      seats.forEach(s=>{
        if(s.jolt>0)s.jolt-=dt;
        if(!s.awake)return;
        s.t-=dt;
        s.turn-=dt; if(s.turn<=0){ s.turn=1.5+Math.random()*3; s.dir=Math.random()<.7?'up':O.pick(['left','right']); }
        if(s.t<=0){ s.awake=false; s.dir='up'; }
      });
    },
    sclick(p){
      if(won)return;
      for(const s of seats){
        if(Math.abs(p.x-s.x)<17&&p.y>headY(s)-6&&p.y<headY(s)+26){
          if(!s.awake){ s.awake=true; s.t=sleepIn(); s.jolt=.3; S.burst(s.x,headY(s)-4,'#ffcd75',8,2); S.say(s.x,headY(s)-6,ln('meet_wake'),S.fontCls(s.a)); }
          else S.say(s.x,headY(s)-6,ln('meet_awake'),S.fontCls(s.a));
          return;
        }
      }
      if(p.x>=122&&p.x<=358&&p.y>=46&&p.y<=150){
        if(isEmail){ won=true; S.burst(240,98,'#a7f070',24,2); S.burst(240,98,'#ffcd75',16,2); K.finish('win',tx('meet_res',{n:awake(),m:seats.length})); }
        else {
          S.say(240,150,ln('meet_wrong'),'f-node');
          const w=seats.filter(x=>x.awake); if(w.length){ const z=O.pick(w); z.awake=false; z.dir='up'; }
          emailIn=Math.max(emailIn,1);
        }
      }
    },
    sdraw(c,t){
      const img=S.view().img;
      seats.forEach((s,i)=>{
        const y=headY(s)+48+(s.jolt>0?-3:0);
        S.bot(c,s.a,s.x,y,2,s.awake?'idle':'blink',s.dir,0);
      });
      /* спинки кресел поверх роботов */
      seats.forEach(s=>c.drawImage(img,s.x-24,194,48,72,s.x-24,194,48,72));
      seats.forEach((s,i)=>{
        if(s.awake)return;
        const k=((t/400|0)+i)%3;
        for(let j=0;j<=k;j++){ const zx=s.x+8+j*5, zy=headY(s)-4-j*7; c.fillStyle='#f4f4f4'; c.fillRect(zx,zy,4,1); c.fillRect(zx+2,zy+1,1,1); c.fillRect(zx+1,zy+2,1,1); c.fillRect(zx,zy+3,4,1); }
      });
    },
    tick(){ return tx('h_meeting',{n:awake(),m:seats.length}); },
    timeout(){ const n=awake(); K.finish(n>=Math.ceil(seats.length/2)?'mid':'fail',tx('meet_res',{n,m:seats.length})); },
    end(grade){ if(slide){ slide.remove(); slide=null; } const s=seats[2]||seats[0]; if(s)setTimeout(()=>S.say(s.x,150,ln(grade==='win'?'meeting_win':'meeting_fail'),S.fontCls(s.a)),300); seats.forEach(s=>{ s.awake=true; s.dir='up'; }); },
    cleanup(){ if(slide){ slide.remove(); slide=null; } seats.forEach(s=>O.release(s.a)); seats=[]; }
  };
})();

/* --- 7. Обновление прошивки (сцена мастерской) --- */
EV.fw=(function(){
  const STEPS=[14,31,48,66,83];
  let bot=null, prog=0, errors=0, popEl=null, nextStep=0, list=[], knocks=0, stuck=false, done=false, glitch=0, el=0;
  function name(){ return bot?(bot.extra?(O.T('slot')+' '+String(bot.def.n).padStart(2,'0')):O.L(bot.def.name)):''; }
  function popup(){
    const q=list.shift()||O.pick(raw('fw_pop'));
    popEl=document.createElement('div'); popEl.className='fwpop';
    const order=Math.random()<.5?[0,1]:[1,0];
    popEl.innerHTML='<div class="fh"></div><div class="fq"></div><div class="fb"></div>';
    popEl.querySelector('.fh').textContent=tx('fw_win_t');
    popEl.querySelector('.fq').textContent=q[0];
    order.forEach(i=>{ const b=document.createElement('button'); b.type='button'; b.className='pbtn'; b.textContent=q[1+i];
      b.addEventListener('click',()=>answer(i===q[3])); popEl.querySelector('.fb').appendChild(b); });
    S.el().appendChild(popEl);
  }
  function answer(ok){
    if(!popEl||K.state()!=='play')return;
    popEl.remove(); popEl=null;
    if(!ok){ errors++; prog=Math.max(0,prog-15); glitch=1.2; S.say(240,88,ln('fw_bad'),S.fontCls(bot)); S.burst(240,150,'#b13e53',14,2); }
    else S.burst(240,40,'#a7f070',8,2);
  }
  return {
    dur:45, scene:'lab',
    ready(){ return K.crew().length>=1; },
    tease(){ const nd=O.byId.node; bot=nd&&nd.placed&&!O.busyMode(nd)?nd:K.crew(1)[0]; if(bot)O.sayChain(bot,tx('fw_say'),true);
      const dd=K.ui.bar.querySelector('.dd'); if(dd)dd.textContent=tx('fw_d',{name:name()}); },
    start(){
      if(!bot)bot=K.crew(1)[0];
      K.hold(bot); prog=0; errors=0; knocks=0; stuck=false; done=false; glitch=0; el=0; nextStep=0;
      list=shuffle(raw('fw_pop').slice());
      K.stageLock(true,false);
      S.open('lab',()=>{
        if(!document.getElementById('fwpop-css')){
          const st=document.createElement('style'); st.id='fwpop-css';
          st.textContent=`.fwpop{position:absolute;left:50%;top:44%;transform:translate(-50%,-50%);width:min(280px,86vw);background:#f4f4f4;color:#1a1c2c;border:2px solid #1a1c2c;
 box-shadow:0 0 0 2px #566c86,0 6px 0 rgba(0,0,0,.35);font-family:'Rubik',sans-serif;animation:bubIn .16s steps(3) both;z-index:2}
.fwpop .fh{background:#3b5dc9;color:#fff;font-family:'Pixelify Sans','JetBrains Mono',monospace;font-size:13px;letter-spacing:.08em;padding:5px 10px}
.fwpop .fq{padding:12px 12px 10px;font-size:15px;line-height:1.35}
.fwpop .fb{display:flex;gap:8px;justify-content:flex-end;padding:0 10px 10px;flex-wrap:wrap}
.fwpop .fb .pbtn{font-size:13px;padding:7px 12px}`;
          document.head.appendChild(st);
        }
        setTimeout(()=>{ if(bot)S.say(240,88,ln('fw_say'),S.fontCls(bot)); },500);
      },142);
    },
    step(dt){
      if(!S.view().on||done)return;
      el+=dt; if(glitch>0)glitch-=dt;
      if(popEl||stuck)return;
      prog=Math.min(99,prog+4.6*dt);
      if(nextStep<STEPS.length&&prog>=STEPS[nextStep]){ nextStep++; popup(); return; }
      if(prog>=99&&!stuck){ stuck=true; S.say(240,88,tx('fw_stuck'),'f-node'); }
    },
    sclick(p){
      if(done||popEl)return;
      if(p.x>192&&p.x<288&&p.y>88&&p.y<236){
        if(stuck){
          knocks++; glitch=.25; S.burst(p.x,p.y,'#ffcd75',8,2);
          if(knocks>=3){ done=true; prog=100; S.burst(240,40,'#a7f070',24,2); S.say(240,88,ln('fw_win'),S.fontCls(bot)); K.finish(errors===0?'win':'mid',tx('fw_res',{n:errors})); }
          else S.say(240,88,ln('fw_knock'),S.fontCls(bot));
        }
      }
    },
    sdraw(c,t){
      /* провода от зажимов к роботу */
      c.fillStyle='#1a1c2c';
      for(let i=0;i<=40;i++){ const u=i/40;
        const x1=122+(196-122)*u, y1=226+(190-226)*u+Math.sin(u*Math.PI)*16; c.fillRect(Math.round(x1),Math.round(y1),2,2);
        const x2=358+(284-358)*u, y2=226+(190-226)*u+Math.sin(u*Math.PI)*16; c.fillRect(Math.round(x2),Math.round(y2),2,2); }
      /* бегущий сигнал по проводам */
      if(!done&&!stuck&&!popEl){ const u=((t/600)%1); c.fillStyle='#a7f070';
        c.fillRect(Math.round(122+74*u),Math.round(226-36*u+Math.sin(u*Math.PI)*16),2,2); c.fillRect(Math.round(358-74*u),Math.round(226-36*u+Math.sin(u*Math.PI)*16),2,2); }
      /* робот на столе */
      const face=done?'happy':glitch>0?((t/80|0)%2?'wow':'sad'):popEl?'q':stuck?((t/500|0)%2?'blink':'off'):'work';
      const jx=glitch>0?((t/50|0)%2?2:-2):0;
      if(bot)S.bot(c,bot,240+jx,234,6,face,'down',0);
      /* полоска установки под лампой */
      c.fillStyle='#1a1c2c'; c.fillRect(168,46,144,12);
      c.fillStyle='#333c57'; c.fillRect(170,48,140,8);
      c.fillStyle=stuck&&!done?((t/300|0)%2?'#ffcd75':'#ef7d57'):'#a7f070'; c.fillRect(170,48,Math.round(140*prog/100),8);
      const str=Math.floor(prog)+'%', w=K.digitsW(str,2); c.fillStyle='#1a1c2c'; c.fillRect(Math.round(240-w/2-3),33,Math.round(w+6),13); K.digits(c,str,Math.round(240-w/2),35,2,'#f4f4f4');
    },
    tick(){ return tx('h_fw',{n:Math.floor(prog)}); },
    timeout(){ if(popEl){ popEl.remove(); popEl=null; } K.finish(prog>=70?'mid':'fail',tx('fw_res',{n:errors})); },
    end(grade){ if(popEl){ popEl.remove(); popEl=null; } if(grade!=='win'&&grade!=='mid'&&bot)setTimeout(()=>S.say(240,88,ln('fw_fail'),S.fontCls(bot)),300); },
    cleanup(){ if(popEl){ popEl.remove(); popEl=null; } if(bot)O.release(bot); bot=null; }
  };
})();

/* --- 8. Пятница, 17:59 (сцена холла) --- */
EV.friday=(function(){
  const DOOR={x:240,y:166};
  let bots=[], el=0, nextT=0, gone=0, opened=false, runT=0;
  function hitBot(p){ let best=null, bd=1e9;
    bots.forEach(b=>{ if(b.st==='out')return; if(Math.abs(p.x-b.x)<17&&p.y>b.y-50&&p.y<b.y+2){ const d=Math.abs(p.y-(b.y-24)); if(d<bd){ bd=d; best=b; } } }); return best; }
  return {
    dur:30, scene:'lobby',
    ready(){ return K.crew().length>=4; },
    tease(){ K.crew(2).forEach((a,i)=>setTimeout(()=>O.sayChain(a,tx('friday_say'),true),i*900)); },
    start(){
      const list=K.crew(7); el=0; nextT=1.5; gone=0; opened=false; runT=0;
      bots=[];
      K.stageLock(true,false);
      S.open('lobby',()=>{
        const V=S.view(), x0=Math.max(70,V.vx+20), x1=Math.min(410,V.vx+V.vw-20), n=V.vw<300?5:list.length, use=list.slice(0,n);
        bots=use.map((a,i)=>{ const x=Math.round(x0+(i+.5)*((x1-x0)/use.length)+(Math.random()-.5)*10), y=Math.round(206+Math.random()*44);
          return {a,x,y,hx:x,hy:y,st:'stay',dir:'down',face:'idle',cool:2+Math.random()*3}; });
        bots.forEach(b=>K.hold(b.a));
        setTimeout(()=>{ const b=bots[0]; if(b)S.say(b.x,b.y-50,ln('friday_say'),S.fontCls(b.a)); },600); },150);
    },
    step(dt){
      if(!S.view().on)return;
      el+=dt;
      nextT-=dt;
      if(nextT<=0){ nextT=Math.max(.9,2.4-el*.05)*(.7+Math.random()*.6);
        const c=bots.filter(b=>b.st==='stay'&&b.cool<=0); if(c.length){ const b=O.pick(c); b.st='sneak'; b.face='blink'; } }
      bots.forEach(b=>{
        if(b.cool>0)b.cool-=dt;
        if(b.st==='sneak'||b.st==='back'){
          const tx_=b.st==='sneak'?DOOR.x:b.hx, ty_=b.st==='sneak'?DOOR.y:b.hy, dx=tx_-b.x, dy=ty_-b.y, d=Math.hypot(dx,dy);
          const sp=(b.st==='sneak'?13+el*.25:30)*dt;
          if(d<=sp+.5){
            if(b.st==='sneak'){ b.st='out'; gone++; S.burst(DOOR.x,DOOR.y-30,'#ffcd75',12,2);
              const o=bots.find(x=>x.st==='stay'); if(o)S.say(o.x,o.y-50,ln('fri_gone'),S.fontCls(o.a)); }
            else { b.st='stay'; b.x=b.hx; b.y=b.hy; b.dir='down'; b.face='sad'; b.cool=2.5+Math.random()*2; }
          } else { b.x+=dx/d*sp; b.y+=dy/d*sp; b.dir=Math.abs(dx)>Math.abs(dy)*1.5?(dx<0?'left':'right'):(dy<0?'up':'down'); }
        }
      });
    },
    sclick(p){
      const b=hitBot(p); if(!b)return;
      if(b.st==='sneak'){ b.st='back'; b.face='sad'; S.say(b.x,b.y-50,ln('fri_caught'),S.fontCls(b.a)); S.burst(b.x,b.y-30,'#ef7d57',6,2); }
      else if(b.st==='stay')S.say(b.x,b.y-50,ln('friday_say'),S.fontCls(b.a));
    },
    sdraw(c,t,dt){
      /* после 18:00 все бегут в дверь */
      if(K.state()==='result'&&opened){
        runT+=dt||0;
        bots.forEach(b=>{ if(b.st==='out')return; const dx=DOOR.x-b.x, dy=DOOR.y-b.y, d=Math.hypot(dx,dy), sp=60*(dt||0);
          if(d<=sp+1){ b.st='out'; } else { b.x+=dx/d*sp; b.y+=dy/d*sp; b.dir=dy<0&&Math.abs(dy)>Math.abs(dx)?'up':dx<0?'left':'right'; b.face='happy'; } });
      }
      /* часы на стене */
      const clock=opened?'18:00':'17:59';
      c.fillStyle='#1a1c2c'; c.fillRect(132,40,44,16); c.fillStyle='#333c57'; c.fillRect(134,42,40,12);
      K.digits(c,clock,136,43,2,opened?'#a7f070':'#ef7d57');
      /* открытая дверь светится */
      if(opened){ c.fillStyle='rgba(255,205,117,.25)'; c.fillRect(182,48,116,98); }
      const order=bots.filter(b=>b.st!=='out').sort((a,b)=>a.y-b.y);
      order.forEach(b=>{
        const moving=b.st==='sneak'||b.st==='back'||(opened&&K.state()==='result');
        const fr=moving?((t/140|0)%4):0;
        S.bot(c,b.a,b.x,b.y,2,b.face,b.dir,fr);
        if(b.st==='sneak'&&(t/300|0)%2){ c.fillStyle='#ef7d57'; c.fillRect(Math.round(b.x)-1,Math.round(b.y)-58,3,7); c.fillRect(Math.round(b.x)-1,Math.round(b.y)-49,3,3); }
      });
    },
    tick(){ return tx('h_friday',{s:String(Math.min(59,30+Math.floor(el))).padStart(2,'0'),n:gone}); },
    timeout(){ opened=true; K.finish(gone===0?'win':gone<=2?'mid':'fail',tx('fri_res',{n:gone})); },
    end(grade){ opened=true; const b=bots.find(x=>x.st!=='out'); if(b)S.say(b.x,b.y-50,ln(grade==='fail'?'friday_fail':'friday_win'),S.fontCls(b.a)); },
    cleanup(){ bots.forEach(b=>O.release(b.a)); bots=[]; }
  };
})();

/* --- 9. Пропал Wi-Fi (в офисе): горячо-холодно --- */
EV.wifi=(function(){
  let spot=null, taps=[], tries=0, bars=0, best=0, lastD=1e9, crew=[], found=false, sayT=0;
  function strength(d){ return d<36?4:d<70?3:d<115?2:d<170?1:0; }
  const COL=['#5d275d','#b13e53','#ef7d57','#ffcd75','#a7f070'];
  return {
    dur:35,
    ready(){ return !!O.pets.find(p=>p.kind==='cat')&&K.crew().length>=3; },
    tease(){ K.crew(2).forEach((a,i)=>setTimeout(()=>O.sayChain(a,tx('wifi_say'),true),i*900)); },
    start(){
      const st=O.stage(), k=O.scale()||1;
      const cx=(st.scrollLeft+st.clientWidth/2)/k, cy=(st.scrollTop+st.clientHeight/2)/k;
      const b=K.viewBox(cx,cy); K.setBox(b);
      const m=22;
      spot={x:Math.round(b.x+m+Math.random()*(b.w-2*m)),y:Math.round(Math.max(64,b.y+34)+Math.random()*(b.y+b.h-m-Math.max(64,b.y+34)))};
      taps=[]; tries=0; bars=0; best=0; lastD=1e9; found=false; sayT=2;
      crew=K.crew(5); crew.forEach(a=>{ K.hold(a); a.face='q'; K.wander(a); });
      K.stageLock(true,false);
    },
    step(dt){
      sayT-=dt;
      if(sayT<=0){ sayT=3+Math.random()*3; const a=O.pick(crew); if(a&&!a.bub)O.say(a,ln('wifi_say')); }
      crew.forEach(a=>{ if(!a.path.length&&Math.random()<dt*.4){ a.face='q'; K.wander(a); } });
      taps.forEach(t=>t.age+=dt); taps=taps.filter(t=>t.age<1.6);
    },
    click(p){
      if(found)return true;
      tries++;
      const d=Math.hypot(p.x-spot.x,p.y-spot.y);
      bars=strength(d); best=Math.max(best,bars);
      taps.push({x:p.x,y:p.y,age:0,b:bars});
      if(d<16){ found=true; K.burst(spot.x,spot.y-6,'#a7f070',24); K.burst(spot.x,spot.y-6,'#ffcd75',14);
        crew.forEach(a=>{ a.face='happy'; }); const a=crew[0]; if(a)O.say(a,ln('wifi_win'),true);
        K.finish(tries<=6?'win':'mid',tx('wifi_res',{n:tries})); return true; }
      const a=crew.slice().sort((x,y)=>Math.hypot(x.x-p.x,x.y-p.y)-Math.hypot(y.x-p.x,y.y-p.y))[0];
      if(a){ O.say(a,ln(d<lastD?'wifi_hot':'wifi_cold'),true); a.face=d<lastD?'wow':'sad'; O.goTo(a,K.nearSpot(p.x,p.y,'ev-wf')); }
      lastD=d;
      return true;
    },
    draw(ctx){
      taps.forEach(t=>{
        const r=Math.round(3+t.age*14);
        ctx.globalAlpha=Math.max(0,1-t.age/1.6); ctx.strokeStyle=COL[t.b]; ctx.lineWidth=1;
        ctx.strokeRect(Math.round(t.x-r)+.5,Math.round(t.y-r)+.5,r*2,r*2);
        for(let i=0;i<4;i++){ ctx.fillStyle=i<t.b?COL[t.b]:'#333c57'; ctx.fillRect(Math.round(t.x)-5+i*3,Math.round(t.y)-2-i*2,2,3+i*2); }
      });
      ctx.globalAlpha=1;
      if(found)K.prop(ctx,'router',spot.x,spot.y-6,0,1);
    },
    tick(){ return tx('h_wifi',{b:bars,n:tries}); },
    timeout(){ found=true; K.finish(best>=3?'mid':'fail',tx('wifi_res',{n:tries})); },
    end(grade){ const a=crew[1]||crew[0]; if(a&&grade!=='win')setTimeout(()=>O.sayChain(a,tx(grade==='fail'?'wifi_fail':'wifi_win'),true),500); },
    cleanup(){ crew.forEach(a=>{ a.face='idle'; O.release(a); }); crew=[]; taps=[]; K.setBox(null); }
  };
})();

/* --- 10. Принтер одержим (в офисе): ловить листы --- */
EV.printer=(function(){
  const PR={x:296,y:66};
  const SHEET=["ooooo..","owwwwo.","owkkwwo","owwwwwo","owkkkwo","owwwwwo","owkkwwo","owwwwwo","ooooooo"];
  const SHEET2=["oooo","owwo","okko","owwo","okko","owwo","oooo"];
  let sheets=[], caught=0, missed=0, spawnT=0, crew=[], b=null, sayT=0, el=0;
  return {
    dur:30,
    ready(){ return K.crew().length>=3; },
    tease(){ K.crew(2).forEach((a,i)=>setTimeout(()=>O.sayChain(a,tx('printer_say'),true),i*900)); },
    start(){
      sheets=[]; caught=0; missed=0; spawnT=.6; sayT=2; el=0;
      b=K.viewBox(PR.x,PR.y+90); K.setBox(b);
      O.focusOn(PR.x,PR.y+90,true);
      crew=K.crew(4); crew.forEach(a=>{ K.hold(a); K.wander(a); });
      K.stageLock(true,false);
    },
    step(dt){
      el+=dt;
      spawnT-=dt;
      if(spawnT<=0){ spawnT=.5+Math.random()*.35;
        const dir=Math.random()<.5?-1:1;
        sheets.push({x:PR.x+dir*4,y:PR.y,vx:dir*(25+Math.random()*70),vy:-(25+Math.random()*45),floor:Math.round(Math.max(96,b.y+40)+Math.random()*Math.max(20,b.y+b.h-14-Math.max(96,b.y+40))),st:'fly',t:Math.random()*6}); }
      sheets.forEach(s=>{
        if(s.st!=='fly')return;
        s.t+=dt; s.vy=Math.min(26,s.vy+46*dt); s.vx*=Math.max(0,1-dt*.5);
        s.x+=s.vx*dt+Math.sin(s.t*5)*14*dt; s.y+=s.vy*dt;
        if(s.x<b.x+4){ s.x=b.x+4; s.vx=Math.abs(s.vx); } if(s.x>b.x+b.w-4){ s.x=b.x+b.w-4; s.vx=-Math.abs(s.vx); }
        if(s.vy>0&&s.y>=s.floor){ s.st='floor'; missed++; }
      });
      sayT-=dt;
      if(sayT<=0){ sayT=3+Math.random()*3; const a=O.pick(crew); if(a&&!a.bub)O.say(a,ln('printer_say')); }
      /* роботы подбирают листы с пола */
      crew.forEach(a=>{
        if(a.path.length)return;
        const fl=sheets.filter(s=>s.st==='floor'&&Math.hypot(s.x-a.x,s.y-a.y)<14);
        if(fl.length){ fl[0].st='gone'; a.face='happy'; }
        if(Math.random()<dt*.5){ const f=sheets.find(s=>s.st==='floor'); if(f)O.goTo(a,K.nearSpot(f.x,f.y,'ev-pr')); else K.wander(a); }
      });
    },
    click(p){
      let best=null, bd=11;
      sheets.forEach(s=>{ if(s.st!=='fly')return; const d=Math.hypot(s.x-p.x,s.y-p.y); if(d<bd){ bd=d; best=s; } });
      if(best){ best.st='caught'; caught++; K.burst(best.x,best.y,'#f4f4f4',10); }
      return true;
    },
    draw(ctx,t){
      const tt=performance.now();
      /* одержимый принтер */
      if((tt/180|0)%2){ ctx.fillStyle='#b13e53'; ctx.fillRect(PR.x-6,PR.y-6,3,2); ctx.fillRect(PR.x+3,PR.y-6,3,2); }
      if((tt/400|0)%2){ ctx.strokeStyle='#b13e53'; ctx.lineWidth=1; ctx.strokeRect(287.5,51.5,19,28); }
      sheets.forEach(s=>{
        if(s.st==='floor'){ ctx.fillStyle='#1a1c2c'; ctx.fillRect(Math.round(s.x)-4,Math.round(s.y)-2,9,5); ctx.fillStyle='#f4f4f4'; ctx.fillRect(Math.round(s.x)-3,Math.round(s.y)-1,7,3); return; }
        if(s.st!=='fly')return;
        const flip=(Math.sin(s.t*7)>0);
        K.pix(ctx,flip?SHEET:SHEET2,Math.round(s.x)-(flip?3:2),Math.round(s.y)-4);
      });
    },
    tick(){ return tx('h_printer',{c:caught,m:missed}); },
    timeout(){ K.finish(caught>=18?'win':caught>=9?'mid':'fail',tx('prn_res',{c:caught,m:missed})); },
    end(grade){ const a=crew[0]; if(a)setTimeout(()=>O.sayChain(a,tx(grade==='win'?'printer_win':grade==='fail'?'printer_fail':'printer_say'),true),400); },
    cleanup(){ crew.forEach(O.release); crew=[]; sheets=[]; K.setBox(null); }
  };
})();
})();
