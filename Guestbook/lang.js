/* Гостевая книга: тексты интерфейса (7 языков). Сами записи не переводятся.
   Поля с формами числа ({one, few, many, other}) выбираются через Intl.PluralRules. */
window.GB_LANG={
en:{
  'title':'GUESTBOOK','back':'< CORE','lang.title':'Language','music':'Music on / off','refresh':'Refresh','find':'Where is my star',
  'count':{one:'{n} trace',other:'{n} traces'},
  'ph.name':'name / nick','ph.phrase':'leave a trace in the universe','send':'Leave a trace',
  'note':'entries are visible to everyone · be kind ✦',
  'err.name':'enter a name','err.phrase':'enter a phrase','err.ban':'no swearing, please','err.net':'no connection to the server',
  'err.server':'the trace server is unavailable, try ↻ a bit later','err.generic':'error','ok.sent':'trace left ✦',
  'find.here':'there it is','find.back':'your star is back in the sky','find.none':'your star is no longer among the last 300 traces',
  'new.since':{one:'while you were away, {n} new trace appeared',other:'while you were away, {n} new traces appeared'},
  'mine':'your trace'
},
ru:{
  'title':'ГОСТЕВАЯ КНИГА','back':'< ЯДРО','lang.title':'Язык','music':'Музыка вкл / выкл','refresh':'Обновить','find':'Где моя звезда',
  'count':{one:'{n} след',few:'{n} следа',many:'{n} следов',other:'{n} следа'},
  'ph.name':'имя / ник','ph.phrase':'оставь след во вселенной','send':'Оставить след',
  'note':'записи видны всем посетителям · будь добрее ✦',
  'err.name':'введи имя','err.phrase':'введи фразу','err.ban':'нецензурная лексика','err.net':'нет связи с сервером',
  'err.server':'сервер следов недоступен, попробуй ↻ чуть позже','err.generic':'ошибка','ok.sent':'след оставлен ✦',
  'find.here':'вот она','find.back':'твоя звезда снова на небе','find.none':'твоей звезды уже нет среди последних 300 следов',
  'new.since':{one:'пока тебя не было, оставили {n} новый след',few:'пока тебя не было, оставили {n} новых следа',many:'пока тебя не было, оставили {n} новых следов',other:'пока тебя не было, оставили {n} новых следа'},
  'mine':'твой след'
},
de:{
  'title':'GÄSTEBUCH','back':'< KERN','lang.title':'Sprache','music':'Musik an / aus','refresh':'Aktualisieren','find':'Wo ist mein Stern',
  'count':{one:'{n} Spur',other:'{n} Spuren'},
  'ph.name':'Name / Nick','ph.phrase':'hinterlasse eine Spur im Universum','send':'Spur hinterlassen',
  'note':'Einträge sieht jeder · sei freundlich ✦',
  'err.name':'Name eingeben','err.phrase':'Satz eingeben','err.ban':'bitte ohne Schimpfwörter','err.net':'keine Verbindung zum Server',
  'err.server':'der Spurenserver ist nicht erreichbar, versuch ↻ etwas später','err.generic':'Fehler','ok.sent':'Spur hinterlassen ✦',
  'find.here':'da ist er','find.back':'dein Stern ist zurück am Himmel','find.none':'dein Stern ist nicht mehr unter den letzten 300 Spuren',
  'new.since':{one:'während du weg warst, kam {n} neue Spur dazu',other:'während du weg warst, kamen {n} neue Spuren dazu'},
  'mine':'deine Spur'
},
fr:{
  'title':'LIVRE D\'OR','back':'< NOYAU','lang.title':'Langue','music':'Musique oui / non','refresh':'Actualiser','find':'Où est mon étoile',
  'count':{one:'{n} trace',many:'{n} de traces',other:'{n} traces'},
  'ph.name':'nom / pseudo','ph.phrase':'laisse une trace dans l\'univers','send':'Laisser une trace',
  'note':'les messages sont visibles par tous · sois gentil ✦',
  'err.name':'entre un nom','err.phrase':'entre une phrase','err.ban':'pas de grossièretés','err.net':'pas de connexion au serveur',
  'err.server':'le serveur des traces est indisponible, réessaie ↻ un peu plus tard','err.generic':'erreur','ok.sent':'trace laissée ✦',
  'find.here':'la voilà','find.back':'ton étoile est revenue dans le ciel','find.none':'ton étoile n\'est plus parmi les 300 dernières traces',
  'new.since':{one:'pendant ton absence, {n} nouvelle trace est apparue',many:'pendant ton absence, {n} de nouvelles traces sont apparues',other:'pendant ton absence, {n} nouvelles traces sont apparues'},
  'mine':'ta trace'
},
es:{
  'title':'LIBRO DE VISITAS','back':'< NÚCLEO','lang.title':'Idioma','music':'Música sí / no','refresh':'Actualizar','find':'Dónde está mi estrella',
  'count':{one:'{n} huella',many:'{n} de huellas',other:'{n} huellas'},
  'ph.name':'nombre / nick','ph.phrase':'deja una huella en el universo','send':'Dejar una huella',
  'note':'los mensajes los ve todo el mundo · sé amable ✦',
  'err.name':'escribe un nombre','err.phrase':'escribe una frase','err.ban':'sin palabrotas, por favor','err.net':'sin conexión con el servidor',
  'err.server':'el servidor de huellas no está disponible, prueba ↻ un poco más tarde','err.generic':'error','ok.sent':'huella dejada ✦',
  'find.here':'ahí está','find.back':'tu estrella ha vuelto al cielo','find.none':'tu estrella ya no está entre las últimas 300 huellas',
  'new.since':{one:'mientras no estabas, apareció {n} huella nueva',many:'mientras no estabas, aparecieron {n} de huellas nuevas',other:'mientras no estabas, aparecieron {n} huellas nuevas'},
  'mine':'tu huella'
},
it:{
  'title':'LIBRO DEGLI OSPITI','back':'< NUCLEO','lang.title':'Lingua','music':'Musica sì / no','refresh':'Aggiorna','find':'Dov\'è la mia stella',
  'count':{one:'{n} traccia',many:'{n} di tracce',other:'{n} tracce'},
  'ph.name':'nome / nick','ph.phrase':'lascia una traccia nell\'universo','send':'Lascia una traccia',
  'note':'i messaggi sono visibili a tutti · sii gentile ✦',
  'err.name':'inserisci un nome','err.phrase':'inserisci una frase','err.ban':'niente parolacce, per favore','err.net':'nessuna connessione al server',
  'err.server':'il server delle tracce non è disponibile, riprova ↻ tra poco','err.generic':'errore','ok.sent':'traccia lasciata ✦',
  'find.here':'eccola','find.back':'la tua stella è tornata in cielo','find.none':'la tua stella non è più tra le ultime 300 tracce',
  'new.since':{one:'mentre eri via, è apparsa {n} nuova traccia',many:'mentre eri via, sono apparse {n} di nuove tracce',other:'mentre eri via, sono apparse {n} nuove tracce'},
  'mine':'la tua traccia'
},
pl:{
  'title':'KSIĘGA GOŚCI','back':'< RDZEŃ','lang.title':'Język','music':'Muzyka wł. / wył.','refresh':'Odśwież','find':'Gdzie jest moja gwiazda',
  'count':{one:'{n} ślad',few:'{n} ślady',many:'{n} śladów',other:'{n} śladu'},
  'ph.name':'imię / nick','ph.phrase':'zostaw ślad we wszechświecie','send':'Zostaw ślad',
  'note':'wpisy widzą wszyscy · bądź miły ✦',
  'err.name':'wpisz imię','err.phrase':'wpisz zdanie','err.ban':'bez przekleństw, proszę','err.net':'brak połączenia z serwerem',
  'err.server':'serwer śladów jest niedostępny, spróbuj ↻ za chwilę','err.generic':'błąd','ok.sent':'ślad zostawiony ✦',
  'find.here':'oto ona','find.back':'twoja gwiazda wróciła na niebo','find.none':'twojej gwiazdy nie ma już wśród ostatnich 300 śladów',
  'new.since':{one:'gdy cię nie było, pojawił się {n} nowy ślad',few:'gdy cię nie było, pojawiły się {n} nowe ślady',many:'gdy cię nie było, pojawiło się {n} nowych śladów',other:'gdy cię nie było, pojawiło się {n} nowego śladu'},
  'mine':'twój ślad'
}
};
