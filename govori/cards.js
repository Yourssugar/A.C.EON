/* ═══════════════════════════════════════════════════════════
   Говорилка — словарь карточек.

   Как добавить карточку:
   1. Впишите её в CARDS:  id: { e:'эмодзи', ru:'слово', pl:'słowo', t:'тип' }
      id — латиница без пробелов, придумывается один раз и больше не меняется.
   2. Добавьте id в нужную рубрику (в конец списка, чтобы старые карточки
      не сдвигались — дочка запоминает, где что лежит).

   Тип (t) задаёт цвет полоски снизу карточки (цвета как в AAC-досках):
     p — люди (жёлтый)      a — действия (зелёный)
     n — предметы (оранжевый) f — чувства (голубой)
     s — да/нет/стоп и другие «социальные» слова (розовый)

   Необязательно:
     audio: { ru:'audio/ru/papa.mp3', pl:'audio/pl/tata.mp3' }
     — если указать, вместо голоса браузера играет этот файл.
   Фото на карточку ставится прямо на странице (настройки → «Фото»).
   ═══════════════════════════════════════════════════════════ */

window.GOVORI_CARDS = {

  categories: [
    { id:'main',    icon:'⭐', ru:'Главное',      pl:'Najważniejsze',
      cards:['ya','mama','papa','hochu','ne_hochu','da','net','eshche','stop','pomogi','dai','idti','smotri','igrat','vsyo'] },

    { id:'feel',    icon:'💛', ru:'Мне…',         pl:'Czuję…',
      cards:['horosho','ploho','gromko','yarko','bolno','strashno','grustno','ustala','zlyus','tiho','obnyat'] },

    { id:'food',    icon:'🍽️', ru:'Еда',          pl:'Jedzenie',
      cards:['est','pit','voda','moloko','sok','hleb','kasha','sup','makarony','pizza','yaico','syr','pechenye'] },

    { id:'shop',    icon:'🛒', ru:'Магазин',      pl:'Sklep',
      cards:['magazin','kupit','morozhenoe','banan','apelsin','yabloko','klubnika','konfeta','shokolad','pizza','moloko','igrushka'] },

    { id:'home',    icon:'🏠', ru:'Дом',          pl:'Dom',
      cards:['dom','tualet','kupatsya','spat','odetsya','telefon','kompyuter','minecraft','multiki','muzyka','risovat','gulyat'] },

    { id:'animals', icon:'🐾', ru:'Животные',     pl:'Zwierzęta',
      cards:['kot','sobaka','ptica','mysh','rybka','loshad'] }
  ],

  cards: {
    /* главное */
    ya:        { e:'🙋‍♀️', ru:'я',          pl:'ja',          t:'p' },
    mama:      { e:'👩',   ru:'мама',       pl:'mama',        t:'p' },
    papa:      { e:'👨',   ru:'папа',       pl:'tata',        t:'p' },
    hochu:     { e:'🤲',   ru:'хочу',       pl:'chcę',        t:'a' },
    ne_hochu:  { e:'🙅‍♀️', ru:'не хочу',    pl:'nie chcę',    t:'s' },
    da:        { e:'👍',   ru:'да',         pl:'tak',         t:'s' },
    net:       { e:'👎',   ru:'нет',        pl:'nie',         t:'s' },
    eshche:    { e:'➕',   ru:'ещё',        pl:'jeszcze',     t:'s' },
    stop:      { e:'✋',   ru:'стоп',       pl:'stop',        t:'s' },
    pomogi:    { e:'🤝',   ru:'помоги',     pl:'pomóż',       t:'a' },
    dai:       { e:'🫴',   ru:'дай',        pl:'daj',         t:'a' },
    idti:      { e:'🚶‍♀️', ru:'идти',       pl:'iść',         t:'a' },
    smotri:    { e:'👀',   ru:'смотри',     pl:'patrz',       t:'a' },
    igrat:     { e:'🧩',   ru:'играть',     pl:'bawić się',   t:'a' },
    vsyo:      { e:'🏁',   ru:'всё',        pl:'koniec',      t:'s' },

    /* чувства */
    horosho:   { e:'😊',   ru:'хорошо',     pl:'dobrze',      t:'f' },
    ploho:     { e:'😣',   ru:'плохо',      pl:'źle',         t:'f' },
    gromko:    { e:'🙉',   ru:'громко',     pl:'głośno',      t:'f' },
    yarko:     { e:'🔆',   ru:'ярко',       pl:'jasno',       t:'f' },
    bolno:     { e:'🤕',   ru:'больно',     pl:'boli',        t:'f' },
    strashno:  { e:'😨',   ru:'страшно',    pl:'boję się',    t:'f' },
    grustno:   { e:'😢',   ru:'грустно',    pl:'smutno',      t:'f' },
    ustala:    { e:'😴',   ru:'устала',     pl:'zmęczona',    t:'f' },
    zlyus:     { e:'😠',   ru:'злюсь',      pl:'jestem zła',  t:'f' },
    tiho:      { e:'🤫',   ru:'тихо',       pl:'cicho',       t:'f' },
    obnyat:    { e:'🤗',   ru:'обнять',     pl:'przytul',     t:'a' },

    /* еда */
    est:       { e:'🍽️',   ru:'есть',       pl:'jeść',        t:'a' },
    pit:       { e:'🥤',   ru:'пить',       pl:'pić',         t:'a' },
    voda:      { e:'💧',   ru:'вода',       pl:'woda',        t:'n' },
    moloko:    { e:'🥛',   ru:'молоко',     pl:'mleko',       t:'n' },
    sok:       { e:'🧃',   ru:'сок',        pl:'sok',         t:'n' },
    hleb:      { e:'🍞',   ru:'хлеб',       pl:'chleb',       t:'n' },
    kasha:     { e:'🥣',   ru:'каша',       pl:'kaszka',      t:'n' },
    sup:       { e:'🍲',   ru:'суп',        pl:'zupa',        t:'n' },
    makarony:  { e:'🍝',   ru:'макароны',   pl:'makaron',     t:'n' },
    pizza:     { e:'🍕',   ru:'пицца',      pl:'pizza',       t:'n' },
    yaico:     { e:'🥚',   ru:'яйцо',       pl:'jajko',       t:'n' },
    syr:       { e:'🧀',   ru:'сыр',        pl:'ser',         t:'n' },
    pechenye:  { e:'🍪',   ru:'печенье',    pl:'ciastko',     t:'n' },

    /* магазин */
    magazin:   { e:'🏪',   ru:'магазин',    pl:'sklep',       t:'n' },
    kupit:     { e:'🛍️',   ru:'купить',     pl:'kupić',       t:'a' },
    morozhenoe:{ e:'🍦',   ru:'мороженое',  pl:'lody',        t:'n' },
    banan:     { e:'🍌',   ru:'банан',      pl:'banan',       t:'n' },
    apelsin:   { e:'🍊',   ru:'апельсин',   pl:'pomarańcza',  t:'n' },
    yabloko:   { e:'🍎',   ru:'яблоко',     pl:'jabłko',      t:'n' },
    klubnika:  { e:'🍓',   ru:'клубника',   pl:'truskawki',   t:'n' },
    konfeta:   { e:'🍬',   ru:'конфета',    pl:'cukierek',    t:'n' },
    shokolad:  { e:'🍫',   ru:'шоколад',    pl:'czekolada',   t:'n' },
    igrushka:  { e:'🧸',   ru:'игрушка',    pl:'zabawka',     t:'n' },

    /* дом */
    dom:       { e:'🏠',   ru:'дом',        pl:'dom',         t:'n' },
    tualet:    { e:'🚽',   ru:'туалет',     pl:'toaleta',     t:'n' },
    kupatsya:  { e:'🛁',   ru:'купаться',   pl:'kąpiel',      t:'a' },
    spat:      { e:'🛏️',   ru:'спать',      pl:'spać',        t:'a' },
    odetsya:   { e:'👕',   ru:'одеться',    pl:'ubrać się',   t:'a' },
    telefon:   { e:'📱',   ru:'телефон',    pl:'telefon',     t:'n' },
    kompyuter: { e:'💻',   ru:'компьютер',  pl:'komputer',    t:'n' },
    minecraft: { e:'⛏️',   ru:'майнкрафт',  pl:'Minecraft',   t:'n' },
    multiki:   { e:'📺',   ru:'мультики',   pl:'bajki',       t:'n' },
    muzyka:    { e:'🎵',   ru:'музыка',     pl:'muzyka',      t:'n' },
    risovat:   { e:'🖍️',   ru:'рисовать',   pl:'rysować',     t:'a' },
    gulyat:    { e:'🌳',   ru:'гулять',     pl:'spacer',      t:'a' },

    /* животные */
    kot:       { e:'🐱',   ru:'кот',        pl:'kot',         t:'n' },
    sobaka:    { e:'🐶',   ru:'собака',     pl:'pies',        t:'n' },
    ptica:     { e:'🐦',   ru:'птица',      pl:'ptak',        t:'n' },
    mysh:      { e:'🐭',   ru:'мышь',       pl:'mysz',        t:'n' },
    rybka:     { e:'🐟',   ru:'рыбка',      pl:'rybka',       t:'n' },
    loshad:    { e:'🐴',   ru:'лошадь',     pl:'koń',         t:'n' }
  }
};
