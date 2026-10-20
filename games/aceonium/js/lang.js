/* Aceonium: тексты интерфейса. Тестовая версия: русский и английский,
   остальные языки сайта пока берут английский (I18n сам откатывается на en).
   Ключ с окончанием .f: вариант для волшебницы (UI.tg выбирает его сам). */
(function(){
'use strict';

I18n.add('ru',{
  'ac.title':'ACEONIUM',
  'u.h':'ч','u.m':'м','u.s':'с',
  'cr.sub':'ПУТЬ МАГА НАЧИНАЕТСЯ ЗДЕСЬ',
  'cr.look':'ОБЛИК','cr.m':'МАГ','cr.f':'ВОЛШЕБНИЦА',
  'cr.name':'ИМЯ','cr.namePh':'Имя героя','cr.nameErr':'2-16 символов: буквы, цифры, пробел, дефис',
  'cr.robe':'МАНТИЯ','cr.go':'В ПУТЬ','cr.drag':'потяни, чтобы повернуть',
  'hud.lvl':'УР.','hud.farm':'ФАРМ','hud.dps':'урон/с','hud.click':'клик',
  'fat.fresh':'БОДР','fat.fresh.f':'БОДРА','fat.tired':'УСТАЛ','fat.tired.f':'УСТАЛА',
  'fat.worn':'ИЗМОТАН','fat.worn.f':'ИЗМОТАНА','fat.spent':'БЕЗ СИЛ',
  'fat.sit':'ОТДЫХ У ДОРОГИ','fat.tavern':'В ТАВЕРНЕ',
  'fat.dmg':'урон {p}%','fat.up':'подъём через {t}',
  'btn.tavern':'ТАВЕРНА','btn.road':'В ПУТЬ',
  'rest.sit':'Маг выбился из сил и отдыхает у дороги. Здесь отдых вдвое медленнее, чем в таверне.',
  'rest.sit.f':'Волшебница выбилась из сил и отдыхает у дороги. Здесь отдых вдвое медленнее, чем в таверне.',
  'rest.tavern':'Маг отдыхает у камина в таверне.','rest.tavern.f':'Волшебница отдыхает у камина в таверне.',
  'rest.up':'Встанет сам через {t}','rest.up.f':'Встанет сама через {t}',
  'rest.early':'Можно отправить в путь раньше, но усталость останется.',
  'boss.fight':'БОЙ С БОССОМ','boss.auto':'автобой','boss.start':'БОСС!','boss.win':'БОСС ПОВЕРЖЕН','boss.fail':'БОСС УСТОЯЛ',
  'boss.failSub':'Назад на 9 уровней. Набирайся сил.','boss.farm':'Фарм: самый сильный враг десятка',
  'en.boss':'БОСС',
  'mon.slime':'СЛИЗЕНЬ','mon.eye':'ОКО','mon.golem':'ГОЛЕМ','mon.ghost':'ПРИЗРАК','mon.spider':'ДРОН-ПАУК',
  'tab.hero':'ГЕРОЙ','tab.staff':'ПОСОХ','tab.skills':'УМЕНИЯ','tab.tavern':'ТАВЕРНА','tab.wardrobe':'ГАРДЕРОБ','tab.prestige':'ОСКОЛКИ','tab.stats':'ИНФО',
  'buy.max':'МАКС','buy.lvl':'УР. +{n}','buy.up':'УЛУЧШИТЬ','buy.done':'МАКСИМУМ','locked':'ЗАКРЫТО',
  'row.lvl':'ур. {n}','row.lvlMax':'ур. {n}/{m}',
  'hero.rebirth':'Перерождение {n}',
  'hero.power':'СИЛА ГЕРОЯ','hero.info':'Урон клика: {v}','hero.sub':'x2 каждые 25 уровней. Клик берёт ещё 4% урона посоха.',
  'hero.critCh':'ШАНС КРИТА','hero.critChInfo':'Сейчас {v}%','hero.critMu':'СИЛА КРИТА','hero.critMuInfo':'Крит бьёт x{v}',
  'staff.title':'ПОСОХ','staff.info':'Урон в секунду: {v}','staff.sub':'x2 каждые 20 уровней. Новая ступень сферы каждые 25.',
  'staff.tier':'Ступень сферы: {n}','staff.next':'Следующая ступень на {n} уровне посоха',
  'sk.overload':'ПЕРЕГРУЗКА','sk.overload.d':'Весь урон x{p} на {d} с',
  'sk.focus':'ФОКУС ЯДРА','sk.focus.d':'+{p}% к шансу крита на {d} с',
  'sk.flurry':'ШКВАЛ','sk.flurry.d':'Посох бьёт в {p} раза чаще {d} с',
  'sk.discharge':'РАЗРЯД','sk.discharge.d':'Мгновенно урон за {p} с работы посоха',
  'sk.harvest':'ЖАТВА','sk.harvest.d':'Монеты x{p} на {d} с',
  'sk.cd':'Откат {t}','sk.locked':'Откроется на {n} уровне героя','sk.lockedShort':'ГЕР. {n}',
  'sk.hint':'Клавиши 1-5. Пробел: удар.',
  'tav.title':'ПОРТАЛ В ТАВЕРНУ','tav.desc':'Портал в таверну: там отдых занимает {h} ч, а у дороги {h2} ч. Отправить можно в любой момент.',
  'tav.locked':'Откроется после {n} уровня','tav.buy':'ОТКРЫТЬ','tav.owned':'Портал открыт',
  'tav.bed':'КРОВАТЬ','tav.bed.i':'Отдых в таверне: {v} ч',
  'tav.amulet':'АМУЛЕТ БОДРОСТИ','tav.amulet.i':'В пути до 100% усталости: {v} ч',
  'tav.lantern':'ФОНАРЬ ПУТНИКА','tav.lantern.i':'Добыча без тебя: {v}%',
  'tav.alch':'АЛХИМИЧЕСКИЙ СТОЛ','tav.alch.i':'Ремесло: +{v}% к доходу в таверне',
  'tav.board':'ДОСКА ЗАКАЗОВ','tav.board.i':'Заказы путников: +{v}% к доходу в таверне',
  'tav.craftT':'НОЧНОЕ РЕМЕСЛО',
  'tav.craftD':'По вечерам у камина собираются путники: караванщики, охотники, травницы. Маг с Ядром в посохе для них редкая удача. Пока он отдыхает в таверне, он варит зелья и заряжает обереги на продажу. Чем сильнее маг в бою, тем дороже его работа. У дороги покупателей нет.',
  'tav.craftNow':'Сейчас: {p}% от боевого дохода, {v} в секунду',
  'tav.coreT':'ЗАРЯД ЯДРА',
  'tav.coreD':'Ядро тоже набирается сил, пока маг спит в тёплой комнате. Каждый час сна в таверне даёт {s} с урона x{m} после выхода в путь, до {x} мин.',
  'rest.craft':'Ночное ремесло: +{v}/с ({p}% от боевого дохода)',
  'rest.charge':'Заряд Ядра: {t} урона x{m} после выхода (+1 мин за час сна)',
  'rest.craftSit':'В таверне маг бы ещё и подрабатывал: +{v}/с',
  'hud.rested':'ЯДРО x{m} · {t}',
  'toast.rested':'Ядро заряжено: урон x{m} на {t}',
  'off.craft':'Ремесло в таверне: {c}',
  'st.craft':'Заработано ремеслом',
  'tales':'Караванщик взял три оберега от ночных теней.|Травница принесла корень лунника и попросила зелье бодрости.|Охотник долго торговался за флакон огня, но заплатил.|Мальчишка с конюшни принёс письмо: в соседней деревне ждут заказ.|Старый паломник оставил монету за благословение посоха.|Хозяйка таверны поставила на стол горячий хлеб, в счёт будущих зелий.|Двое наёмников купили всё, что светилось.|Купец с юга заказал амулет к весне и заплатил вперёд.',
  'tales.f':'Караванщик взял три оберега от ночных теней.|Травница принесла корень лунника и попросила зелье бодрости.|Охотник долго торговался за флакон огня, но заплатил.|Мальчишка с конюшни принёс письмо: в соседней деревне ждут заказ.|Старый паломник оставил монету за благословение посоха.|Хозяйка таверны поставила на стол горячий хлеб, в счёт будущих зелий.|Двое наёмников купили всё, что светилось.|Купец с юга заказал у волшебницы амулет к весне и заплатил вперёд.',
  'tav.info':'Усталость: {a} ч в пути до 100%. Отдых: таверна {r} ч, у дороги {r2} ч.',
  'tav.curve':'Урон: до 25% усталости полный, к 60% 75%, к 90% 40%, на 100% маг садится отдыхать.',
  'wd.look':'ОБЛИК','wd.name':'ИМЯ','wd.save':'СОХРАНИТЬ','wd.robe':'ЦВЕТ МАНТИИ',
  'wd.open':'с {n} ур.','wd.free':'даром','wd.wear':'надето','wd.saved':'Сохранено',
  'robe.wander':'Странник','robe.ash':'Пепел','robe.night':'Ночь','robe.moss':'Мох','robe.cyan':'Лазурь','robe.violet':'Аметист','robe.ember':'Угли',
  'robe.gold':'Золото','robe.rose':'Роза','robe.ice':'Лёд','robe.void':'Бездна','robe.toxic':'Яд','robe.aceon':'A.C.EON',
  'pr.title':'ПЕРЕРОЖДЕНИЕ',
  'pr.desc':'Возврат в начало пути. Сбрасываются монеты, уровни, герой, посох, умения и таверна. Взамен Осколки Ядра: каждый неистраченный осколок даёт +10% к урону и монетам навсегда.',
  'pr.keep':'Остаются: имя, облик, гардероб, реликвии, осколки, рекорд.',
  'pr.shards':'Осколки Ядра: {n}','pr.bonus':'бонус +{p}%','pr.gain':'За перерождение сейчас: {n}',
  'pr.need':'Победи босса {n} уровня','pr.btn':'ПЕРЕРОДИТЬСЯ','pr.confirm':'Переродиться и получить {n} осколков?',
  'pr.relics':'РЕЛИКВИИ','pr.relicNote':'Реликвии покупаются за осколки. Потраченный осколок больше не даёт +10%.',
  'pr.done':'Перерождение: +{n} осколков',
  'rl.start':'ТРОПА ПРЕДКОВ','rl.start.d':'Старт с уровня {v}',
  'rl.eye':'ЗОРКИЙ ГЛАЗ','rl.eye.d':'+{v}% шанс крита',
  'rl.edge':'ГРАНЬ ЯДРА','rl.edge.d':'+{v} к силе крита',
  'rl.flow':'ПОТОК','rl.flow.d':'-{v}% откат умений',
  'rl.stamina':'ЖИЛА ВЫНОСЛИВОСТИ','rl.stamina.d':'+{v} ч в пути',
  'rl.dream':'СОН МУДРЕЦА','rl.dream.d':'-{v} ч отдыха',
  'rl.shadow':'ТЕНЬ ПУТНИКА','rl.shadow.d':'+{v}% добычи без тебя',
  'rl.trophy':'ТРОФЕЙ','rl.trophy.d':'+{v}% монет с боссов',
  'rl.autoportal':'ЗОВ ТАВЕРНЫ','rl.autoportal.d':'На 100% усталости сам уходит в таверну (нужен портал)',
  'st.title':'СТАТИСТИКА','st.kills':'Врагов побеждено','st.bosses':'Боссов','st.bossFails':'Поражений от боссов','st.clicks':'Кликов',
  'st.play':'В игре','st.rest':'В отдыхе','st.earned':'Добыто за жизнь','st.earnedAll':'Добыто всего','st.max':'Рекорд уровня','st.rebirths':'Перерождений',
  'st.save':'СОХРАНЕНИЕ','st.export':'ЭКСПОРТ','st.import':'ИМПОРТ','st.copied':'Строка сохранения скопирована',
  'st.importPh':'Вставь строку сохранения','st.importBad':'Строка не подходит','st.importOk':'Сохранение загружено',
  'st.reset':'СБРОСИТЬ ВСЁ','st.resetConfirm':'Удалить весь прогресс? Это нельзя отменить.',
  'st.note':'Прогресс хранится в этом браузере. Экспорт поможет перенести его.',
  'off.title':'ПОКА ТЕБЯ НЕ БЫЛО','off.away':'Отсутствие: {t}','off.fight':'Сражался: {t}','off.fight.f':'Сражалась: {t}',
  'off.rest':'Отдыхал: {t}','off.rest.f':'Отдыхала: {t}','off.coins':'Добыто: {c}','off.kills':'Врагов: {n}',
  'ok':'ОК','cancel':'ОТМЕНА','yes':'ДА',
  'toast.unlock':'Новое умение: {s}','toast.robe':'Открыт цвет мантии: {s}','toast.tavern':'Портал в таверну открыт',
  'toast.clock':'Часы компьютера ушли назад: время отсутствия не засчитано',
  'no3d':'3D недоступно в этом браузере. Игра работает, но без сцены.',
  'dbg.title':'ОТЛАДКА',
  'wd2.create':'СОЗДАНИЕ ГЕРОЯ','wd2.body':'РОСТ','wd2.face':'ЛИЦО','wd2.hood':'КАПЮШОН',
  'wd2.tLook':'ОБЛИК','wd2.tGear':'ОДЕЖДА','wd2.tStaff':'ПОСОХ',
  'wd2.male':'Мужчина','wd2.female':'Женщина','wd2.skin':'КОЖА','wd2.hair':'ПРИЧЁСКА','wd2.hairColor':'ЦВЕТ ВОЛОС','wd2.beard':'БОРОДА','wd2.eyes':'ГЛАЗА',
  'wd2.color':'ЦВЕТ: {o}','wd2.variant':'Вариант {n}',
  'wd2.loading':'Загрузка {s}','wd2.loadErr':'Не удалось скачать файлы, попробуй ещё раз',
  'wd2.notFree':'Эта вещь платная. Её можно купить в гардеробе по ходу игры.',
  'wd2.locked':'В образе есть вещи, которые ещё не открыты.','wd2.buy':'КУПИТЬ','wd2.noCoins':'Не хватает ACEONIUM.',
  'wd2.open':'ОТКРЫТЬ ГАРДЕРОБ','wd2.about':'Облик, одежда по частям, цвета нарядов и посохи. Вещи примеряются сразу, новые файлы скачиваются один раз.',
  'wd2.staffNote':'Цвет сферы зависит от ступени посоха (вкладка ПОСОХ).',
  'hair.none':'Нет','hair.parted':'Пробор','hair.long':'Длинные','hair.buns':'Пучки','hair.buzzed':'Ёжик','hair.buzzedf':'Короткие',
  'beard.none':'Нет','beard.beard':'Борода',
  'slot.hood':'КАПЮШОН','slot.shoulders':'НАПЛЕЧНИК','slot.body':'ВЕРХ','slot.arms':'РУКАВА','slot.legs':'НИЗ','slot.feet':'ОБУВЬ',
  'outfit.none':'Нет','outfit.ranger':'Следопыт','outfit.peasant':'Путник',
  'staff.gnarled':'Узловатый','staff.crystal':'Кристальный','staff.bone':'Костяной','staff.iron':'Рунный','staff.branch':'Живая ветвь',
  'toast.item':'В гардеробе открылось: {s}',
  'gfx.title':'ГРАФИКА','gfx.auto':'АВТО','gfx.low':'НИЗКАЯ','gfx.medium':'СРЕДНЯЯ','gfx.high':'ВЫСОКАЯ','gfx.ultra':'ХОЛСТ',
  'gfx.now':'Сейчас: {q}','gfx.lowered':'Графика снижена до уровня {q}: не хватало кадров',
  'gfx.d.low':'Редкий лес, без травы и тумана, пониженное разрешение.',
  'gfx.d.medium':'Лес гуще, трава, туман и пылинки.',
  'gfx.d.high':'Полный лес, тени от солнца, свечение магии.',
  'gfx.d.ultra':'Как картина маслом: мазки, зерно холста, чёткие тени. Нужна хорошая видеокарта.'
});

I18n.add('en',{
  'ac.title':'ACEONIUM',
  'u.h':'h','u.m':'m','u.s':'s',
  'cr.sub':'THE MAGE\'S PATH STARTS HERE',
  'cr.look':'LOOK','cr.m':'MAGE','cr.f':'SORCERESS',
  'cr.name':'NAME','cr.namePh':'Hero name','cr.nameErr':'2-16 characters: letters, digits, space, hyphen',
  'cr.robe':'ROBE','cr.go':'SET OUT','cr.drag':'drag to rotate',
  'hud.lvl':'LV.','hud.farm':'FARM','hud.dps':'dps','hud.click':'click',
  'fat.fresh':'FRESH','fat.tired':'TIRED','fat.worn':'WORN OUT','fat.spent':'EXHAUSTED',
  'fat.sit':'RESTING BY THE ROAD','fat.tavern':'IN THE TAVERN',
  'fat.dmg':'damage {p}%','fat.up':'up in {t}',
  'btn.tavern':'TAVERN','btn.road':'SET OUT',
  'rest.sit':'The mage ran out of strength and rests by the road. Resting here is twice as slow as in the tavern.',
  'rest.sit.f':'The sorceress ran out of strength and rests by the road. Resting here is twice as slow as in the tavern.',
  'rest.tavern':'The mage rests by the tavern fire.','rest.tavern.f':'The sorceress rests by the tavern fire.',
  'rest.up':'Gets up on their own in {t}',
  'rest.early':'You can send them out earlier, the fatigue stays.',
  'boss.fight':'FIGHT THE BOSS','boss.auto':'auto','boss.start':'BOSS!','boss.win':'BOSS DEFEATED','boss.fail':'THE BOSS HELD',
  'boss.failSub':'Back 9 levels. Get stronger.','boss.farm':'Farming the strongest enemy of this ten',
  'en.boss':'BOSS',
  'mon.slime':'SLIME','mon.eye':'EYE','mon.golem':'GOLEM','mon.ghost':'GHOST','mon.spider':'SPIDER DRONE',
  'tab.hero':'HERO','tab.staff':'STAFF','tab.skills':'SKILLS','tab.tavern':'TAVERN','tab.wardrobe':'WARDROBE','tab.prestige':'SHARDS','tab.stats':'INFO',
  'buy.max':'MAX','buy.lvl':'LV. +{n}','buy.up':'UPGRADE','buy.done':'MAXED','locked':'LOCKED',
  'row.lvl':'lv. {n}','row.lvlMax':'lv. {n}/{m}',
  'hero.rebirth':'Rebirth {n}',
  'hero.power':'HERO POWER','hero.info':'Click damage: {v}','hero.sub':'x2 every 25 levels. A click also takes 4% of staff dps.',
  'hero.critCh':'CRIT CHANCE','hero.critChInfo':'Now {v}%','hero.critMu':'CRIT POWER','hero.critMuInfo':'Crits hit x{v}',
  'staff.title':'STAFF','staff.info':'Damage per second: {v}','staff.sub':'x2 every 20 levels. New orb tier every 25.',
  'staff.tier':'Orb tier: {n}','staff.next':'Next tier at staff level {n}',
  'sk.overload':'OVERLOAD','sk.overload.d':'All damage x{p} for {d} s',
  'sk.focus':'CORE FOCUS','sk.focus.d':'+{p}% crit chance for {d} s',
  'sk.flurry':'FLURRY','sk.flurry.d':'Staff fires {p} times faster for {d} s',
  'sk.discharge':'DISCHARGE','sk.discharge.d':'Instant damage worth {p} s of staff fire',
  'sk.harvest':'HARVEST','sk.harvest.d':'Coins x{p} for {d} s',
  'sk.cd':'Cooldown {t}','sk.locked':'Unlocks at hero level {n}','sk.lockedShort':'HERO {n}',
  'sk.hint':'Keys 1-5. Space: strike.',
  'tav.title':'TAVERN PORTAL','tav.desc':'A portal to the tavern: rest takes {h} h there and {h2} h by the road. Send the hero any time.',
  'tav.locked':'Unlocks after level {n}','tav.buy':'OPEN','tav.owned':'Portal is open',
  'tav.bed':'BED','tav.bed.i':'Tavern rest: {v} h',
  'tav.amulet':'AMULET OF VIGOR','tav.amulet.i':'On the road until 100% fatigue: {v} h',
  'tav.lantern':'TRAVELER\'S LANTERN','tav.lantern.i':'Loot while away: {v}%',
  'tav.alch':'ALCHEMY TABLE','tav.alch.i':'Craft: +{v}% to tavern income',
  'tav.board':'ORDER BOARD','tav.board.i':'Travelers\' orders: +{v}% to tavern income',
  'tav.craftT':'NIGHT CRAFT',
  'tav.craftD':'In the evenings travelers gather by the fire: caravan drivers, hunters, herbalists. A mage with a Core in the staff is rare luck for them. While resting in the tavern the hero brews potions and charges charms for sale. The stronger the hero is in battle, the more the work is worth. There are no buyers by the road.',
  'tav.craftNow':'Now: {p}% of battle income, {v} per second',
  'tav.coreT':'CORE CHARGE',
  'tav.coreD':'The Core also gathers strength while the hero sleeps in a warm room. Each hour of tavern sleep gives {s} s of x{m} damage after setting out, up to {x} min.',
  'rest.craft':'Night craft: +{v}/s ({p}% of battle income)',
  'rest.charge':'Core charge: {t} of x{m} damage after setting out (+1 min per hour of sleep)',
  'rest.craftSit':'In the tavern the hero would also earn: +{v}/s',
  'hud.rested':'CORE x{m} · {t}',
  'toast.rested':'Core charged: x{m} damage for {t}',
  'off.craft':'Tavern craft: {c}',
  'st.craft':'Earned by craft',
  'tales':'A caravan driver took three charms against night shades.|A herbalist brought moonroot and asked for a vigor potion.|A hunter haggled long over a flask of fire, then paid.|A stable boy brought a letter: the next village is waiting for an order.|An old pilgrim left a coin for the staff\'s blessing.|The tavern keeper put hot bread on the table, against future potions.|Two mercenaries bought everything that glowed.|A merchant from the south ordered an amulet for spring and paid ahead.',
  'tav.info':'Fatigue: {a} h on the road to 100%. Rest: tavern {r} h, roadside {r2} h.',
  'tav.curve':'Damage: full up to 25% fatigue, 75% at 60%, 40% at 90%, at 100% the hero sits down to rest.',
  'wd.look':'LOOK','wd.name':'NAME','wd.save':'SAVE','wd.robe':'ROBE COLOR',
  'wd.open':'lv. {n}','wd.free':'free','wd.wear':'worn','wd.saved':'Saved',
  'robe.wander':'Wanderer','robe.ash':'Ash','robe.night':'Night','robe.moss':'Moss','robe.cyan':'Azure','robe.violet':'Amethyst','robe.ember':'Embers',
  'robe.gold':'Gold','robe.rose':'Rose','robe.ice':'Ice','robe.void':'Void','robe.toxic':'Venom','robe.aceon':'A.C.EON',
  'pr.title':'REBIRTH',
  'pr.desc':'Return to the start of the path. Coins, levels, hero, staff, skills and tavern reset. In return you get Core Shards: every unspent shard gives +10% damage and coins forever.',
  'pr.keep':'Kept: name, look, wardrobe, relics, shards, record.',
  'pr.shards':'Core Shards: {n}','pr.bonus':'bonus +{p}%','pr.gain':'Rebirth now gives: {n}',
  'pr.need':'Defeat the level {n} boss','pr.btn':'REBIRTH','pr.confirm':'Rebirth and get {n} shards?',
  'pr.relics':'RELICS','pr.relicNote':'Relics cost shards. A spent shard no longer gives +10%.',
  'pr.done':'Rebirth: +{n} shards',
  'rl.start':'ANCESTRAL PATH','rl.start.d':'Start at level {v}',
  'rl.eye':'KEEN EYE','rl.eye.d':'+{v}% crit chance',
  'rl.edge':'CORE EDGE','rl.edge.d':'+{v} crit power',
  'rl.flow':'FLOW','rl.flow.d':'-{v}% skill cooldown',
  'rl.stamina':'VEIN OF STAMINA','rl.stamina.d':'+{v} h on the road',
  'rl.dream':'SAGE\'S SLEEP','rl.dream.d':'-{v} h rest',
  'rl.shadow':'TRAVELER\'S SHADOW','rl.shadow.d':'+{v}% loot while away',
  'rl.trophy':'TROPHY','rl.trophy.d':'+{v}% boss coins',
  'rl.autoportal':'TAVERN CALL','rl.autoportal.d':'At 100% fatigue goes to the tavern alone (portal needed)',
  'st.title':'STATS','st.kills':'Enemies defeated','st.bosses':'Bosses','st.bossFails':'Boss losses','st.clicks':'Clicks',
  'st.play':'Played','st.rest':'Resting','st.earned':'Earned this life','st.earnedAll':'Earned total','st.max':'Level record','st.rebirths':'Rebirths',
  'st.save':'SAVE','st.export':'EXPORT','st.import':'IMPORT','st.copied':'Save string copied',
  'st.importPh':'Paste a save string','st.importBad':'This string does not fit','st.importOk':'Save loaded',
  'st.reset':'RESET ALL','st.resetConfirm':'Delete all progress? This cannot be undone.',
  'st.note':'Progress is stored in this browser. Export helps to move it.',
  'off.title':'WHILE YOU WERE AWAY','off.away':'Away: {t}','off.fight':'Fought: {t}','off.rest':'Rested: {t}','off.coins':'Earned: {c}','off.kills':'Enemies: {n}',
  'ok':'OK','cancel':'CANCEL','yes':'YES',
  'toast.unlock':'New skill: {s}','toast.robe':'Robe color unlocked: {s}','toast.tavern':'Tavern portal opened',
  'toast.clock':'The computer clock went back: away time not counted',
  'no3d':'3D is not available in this browser. The game works without the scene.',
  'dbg.title':'DEBUG',
  'wd2.create':'CREATE HERO','wd2.body':'FULL','wd2.face':'FACE','wd2.hood':'HOOD',
  'wd2.tLook':'LOOK','wd2.tGear':'GEAR','wd2.tStaff':'STAFF',
  'wd2.male':'Male','wd2.female':'Female','wd2.skin':'SKIN','wd2.hair':'HAIR','wd2.hairColor':'HAIR COLOR','wd2.beard':'BEARD','wd2.eyes':'EYES',
  'wd2.color':'COLOR: {o}','wd2.variant':'Variant {n}',
  'wd2.loading':'Loading {s}','wd2.loadErr':'Could not download files, try again',
  'wd2.notFree':'This item is paid. You can buy it in the wardrobe later.',
  'wd2.locked':'The look has items that are not unlocked yet.','wd2.buy':'BUY','wd2.noCoins':'Not enough ACEONIUM.',
  'wd2.open':'OPEN WARDROBE','wd2.about':'Look, clothes by parts, outfit colors and staffs. Items are tried on at once, new files download once.',
  'wd2.staffNote':'The orb color depends on the staff tier (STAFF tab).',
  'hair.none':'None','hair.parted':'Parted','hair.long':'Long','hair.buns':'Buns','hair.buzzed':'Buzzed','hair.buzzedf':'Short',
  'beard.none':'None','beard.beard':'Beard',
  'slot.hood':'HOOD','slot.shoulders':'PAULDRON','slot.body':'TOP','slot.arms':'SLEEVES','slot.legs':'BOTTOM','slot.feet':'BOOTS',
  'outfit.none':'None','outfit.ranger':'Ranger','outfit.peasant':'Traveler',
  'staff.gnarled':'Gnarled','staff.crystal':'Crystal','staff.bone':'Bone','staff.iron':'Runic','staff.branch':'Living branch',
  'toast.item':'Unlocked in the wardrobe: {s}',
  'gfx.title':'GRAPHICS','gfx.auto':'AUTO','gfx.low':'LOW','gfx.medium':'MEDIUM','gfx.high':'HIGH','gfx.ultra':'CANVAS',
  'gfx.now':'Now: {q}','gfx.lowered':'Graphics lowered to {q}: not enough frames',
  'gfx.d.low':'Sparse forest, no grass or fog, lower resolution.',
  'gfx.d.medium':'Denser forest, grass, fog and dust.',
  'gfx.d.high':'Full forest, sun shadows, magic glow.',
  'gfx.d.ultra':'Like an oil painting: brush strokes, canvas grain, crisp shadows. Needs a good GPU.'
});
/* v8a: походы за ресурсами */
I18n.add('ru',{
  'tab.path':'ПУТЬ','tab.store':'СКЛАД','tab.work':'МАСТЕРСКАЯ','tab.skills':'УМЕНИЯ','tab.stats':'ИНФО',
  'hud.home':'ДОМА','hud.sleep':'СОН','hud.wave':'Волна {w}/100 · {m}/{n}','hud.bossWave':'Босс волны {w}','hud.mlvl':'Маг ур. {n}','hud.waveShort':'волна',
  'fat.home':'ДОМА','fat.sleep':'СПИТ',
  'btn.home':'ДОМОЙ','btn.trip':'В ПОХОД','btn.sleep':'ЛЕЧЬ СПАТЬ',
  'rest.home':'Маг дома, в своей комнате в таверне. Сумка разобрана, всё на складе.','rest.home.f':'Волшебница дома, в своей комнате в таверне. Сумка разобрана, всё на складе.',
  'rest.sleep':'Маг спит. Во сне он ничего не добывает.','rest.sleep.f':'Волшебница спит. Во сне она ничего не добывает.',
  'rest.next':'Следующий поход: {t}, через {s} с','rest.wait':'Ждёт команды: автопоход выключен.','rest.toSleep':'Сейчас ляжет спать.',
  'rest.charge':'Заряд Ядра: {t} урона x{m} в начале похода (+1 мин за час сна)',
  'mon.wood':'ДРЕВЕНЬ','mon.iron':'РУДНЫЙ ГОЛЕМ','mon.herb':'СЛИЗЕНЬ-ТРАВНИК','mon.hide':'ЛЕСНОЙ ЛОВЧИЙ','mon.bone':'КОСТЯНОЙ ГОЛЕМ',
  'mon.silk':'ПАУК-ТКАЧ','mon.spore':'ГРИБНАЯ СЛИЗЬ','mon.ecto':'ПРИЗРАК','mon.crystal':'КРИСТАЛЬНЫЙ ГЛАЗ','mon.silver':'СЕРЕБРЯНЫЙ ГОЛЕМ',
  'boss.summer':'ЖЕЛЕЗНОЕ ДРЕВО','boss.autumn':'ХОЗЯИН ЧАЩИ','boss.swamp':'КОРОЛЕВА ТОПЕЙ','boss.pass':'СТРАЖ ПЕРЕВАЛА',
  'boss.fail':'МАГ ОТСТУПИЛ','boss.rage':'ЯРОСТЬ','boss.loot':'Редких ресурсов: {n}','boss.clear':'Тракт пройден','boss.clearFirst':'Тракт пройден впервые. Шанс ресурсов тут вырос.',
  'home.back':'Маг вернулся: +{n}','home.lostBag':'Сумка потеряна: {n} шт.','home.over':'не влезло на склад: {n}',
  'why.full':'сумка полная','why.end':'тракт пройден','why.tired':'кончились силы','why.manual':'отозван домой','why.cautious':'осторожность: босс не по силам','why.defeat':'проиграл боссу',
  'tr.summer':'ЛЕТНИЙ ТРАКТ','tr.autumn':'ОСЕННИЙ ЛЕС','tr.swamp':'НОЧНЫЕ ТОПИ','tr.pass':'СУМЕРЕЧНЫЙ ПЕРЕВАЛ',
  'tr.locked':'закрыт','tr.here':'маг здесь','tr.cleared':'пройден x{n}','tr.best':'рекорд: волна {w}','tr.new':'не был',
  'tr.rec':'Рекомендуется: урон {a} - {b}, ур. мага {la} - {lb}','tr.chance':'Шанс ресурса: {a} - {b}','tr.chanceUp':'(после первого прохождения выше)',
  'tr.need':'Откроется после первого прохождения: {t}','tr.go':'ИДТИ СЕЙЧАС','tr.going':'В ПУТИ',
  'res.wood':'дерево','res.iron':'железо','res.herb':'травы','res.hide':'кожа','res.bone':'кость','res.silk':'шёлк','res.spore':'споры',
  'res.ecto':'эктоплазма','res.crystal':'кристалл','res.silver':'серебро','res.ironwood':'железодрев','res.amber':'янтарное сердце','res.pearl':'лунная жемчужина','res.starice':'звёздный лёд',
  'mage.stats':'Урон {d}/с · здоровье {h} · опыт {x}/{n}',
  'st.road':'В походе: {t}, волна {w}. Сумка {n}/{c}.','st.sleep':'Спит. Проснётся через {t}.','st.home':'Дома, собирается в поход.','st.sleep.f':'Спит. Проснётся через {t}.',
  'plan.title':'ПЛАН ПОХОДОВ','plan.hint':'Отметь, сколько раз пройти каждый тракт. Маг идёт по плану сверху вниз, между походами спит, когда устал. Когда план выполнен, повторяет последний тракт.',
  'plan.left':'По плану осталось походов: {n}','plan.empty':'План пуст: маг ходит на {t}','plan.times':'x{n}','plan.goNow':'Следующий поход: {t}',
  'opt.cautious':'ОСТОРОЖНОСТЬ','opt.cautiousD':'Перед боссом маг считает бой. Если выходит поражение, возвращается домой с сумкой, а не теряет её.',
  'opt.auto':'САМ УХОДИТ В ПОХОД','opt.autoD':'После возвращения и сна маг сам идёт дальше по плану.',
  'store.title':'СКЛАД','store.cap':'Вмещает до {n} каждого ресурса. Лишнее при разгрузке сумки пропадает.','store.bag':'В СУМКЕ: {n}/{c}','st.none':'пусто',
  'jr.title':'ЖУРНАЛ ПОХОДОВ','jr.empty':'Походов ещё не было.','jr.wave':'волна {w}','jr.lost':'потеряно {n}',
  'work.hint':'Мастеров в таверне пока нет, поэтому маг улучшает вещи сам из ресурсов со склада. В следующей версии это перейдёт к мастерам.',
  'work.staff':'ПОСОХ','work.staffI':'Урон посоха {v}/с, со следующим уровнем {n}/с','work.tier':'Ступень {n}. Следующая на {l} ур., нужен редкий ресурс.',
  'work.bag':'СУМКА','work.bagI':'Вмещает {c}, подбор {p}','work.next':'дальше: {s}','work.bagS':'С маленькой сумкой маг подбирает не всё. Большая сумка: выше шанс, но и терять при поражении больше.',
  'work.store':'СКЛАД','work.storeI':'До {c} каждого ресурса',
  'sk.points':'Очков умений: {n}. Одно очко за каждый уровень мага.','sk.pts':'{n} оч.','sk.locked':'Откроется на {n} уровне мага','sk.lockedShort':'УР. {n}',
  'sk.harvest.d':'Шанс ресурса x{p} на {d} с',
  'wd2.about8':'Пока в игре нет золота, вещи гардероба открываются бесплатно с уровнем мага. Цены вернутся вместе с таверной.',
  'st.trips':'Походов','st.gathered':'Принесено ресурсов','st.lostBags':'Потеряно сумок','st.lostItems':'Потеряно ресурсов','st.clears':'Трактов пройдено','st.rest':'Во сне',
  'off.trips':'Походов: {n}','off.sleep':'Спал: {t}','off.sleep.f':'Спала: {t}','off.got':'ПРИНЕСЕНО','off.lost':'Потеряно сумок: {n} ({i} шт.)','off.over':'Не влезло на склад: {n}','off.lvl':'Уровень мага: {a} -> {b}',
  'toast.tract':'Открыт новый тракт: {t}','toast.level':'Уровень мага {n}','toast.item':'В гардеробе открылось: {s}',
  'mig.title':'НОВАЯ ВЕРСИЯ',
  'mig.body':'<p>Игра переделана: с монстров теперь падают ресурсы, а не золото. Они копятся в сумке и попадают на склад, когда маг возвращается домой. Проиграл боссу: сумка потеряна.</p><p>Персонаж, облик и гардероб сохранены, прогресс начат заново.</p><p>План походов и осторожность во вкладке ПУТЬ.</p>'
});
I18n.add('en',{
  'tab.path':'PATH','tab.store':'STORE','tab.work':'WORKSHOP','tab.skills':'SKILLS','tab.stats':'INFO',
  'hud.home':'HOME','hud.sleep':'SLEEP','hud.wave':'Wave {w}/100 · {m}/{n}','hud.bossWave':'Boss of wave {w}','hud.mlvl':'Mage lv. {n}','hud.waveShort':'wave',
  'fat.home':'HOME','fat.sleep':'ASLEEP',
  'btn.home':'GO HOME','btn.trip':'SET OUT','btn.sleep':'GO TO SLEEP',
  'rest.home':'The mage is home, in their room at the tavern. The bag is unpacked into the store.',
  'rest.sleep':'The mage is asleep and gathers nothing.',
  'rest.next':'Next trip: {t}, in {s} s','rest.wait':'Waiting: auto trips are off.','rest.toSleep':'Going to sleep now.',
  'rest.charge':'Core charge: {t} of x{m} damage at the start of the trip (+1 min per hour of sleep)',
  'mon.wood':'TREANT','mon.iron':'ORE GOLEM','mon.herb':'HERB SLIME','mon.hide':'FOREST STALKER','mon.bone':'BONE GOLEM',
  'mon.silk':'WEAVER SPIDER','mon.spore':'SPORE SLIME','mon.ecto':'GHOST','mon.crystal':'CRYSTAL EYE','mon.silver':'SILVER GOLEM',
  'boss.summer':'IRON TREE','boss.autumn':'LORD OF THE THICKET','boss.swamp':'MARSH QUEEN','boss.pass':'PASS WARDEN',
  'boss.fail':'THE MAGE RETREATED','boss.rage':'RAGE','boss.loot':'Rare resources: {n}','boss.clear':'Tract cleared','boss.clearFirst':'First clear. Drop chance here is higher now.',
  'home.back':'The mage is back: +{n}','home.lostBag':'Bag lost: {n} items','home.over':'did not fit the store: {n}',
  'why.full':'bag full','why.end':'tract cleared','why.tired':'out of strength','why.manual':'called home','why.cautious':'caution: boss too strong','why.defeat':'lost to the boss',
  'tr.summer':'SUMMER ROAD','tr.autumn':'AUTUMN WOODS','tr.swamp':'NIGHT MARSH','tr.pass':'DUSK PASS',
  'tr.locked':'locked','tr.here':'mage is here','tr.cleared':'cleared x{n}','tr.best':'best: wave {w}','tr.new':'not visited',
  'tr.rec':'Recommended: damage {a} - {b}, mage lv. {la} - {lb}','tr.chance':'Drop chance: {a} - {b}','tr.chanceUp':'(higher after the first clear)',
  'tr.need':'Opens after the first clear of: {t}','tr.go':'GO NOW','tr.going':'ON THE ROAD',
  'res.wood':'wood','res.iron':'iron','res.herb':'herbs','res.hide':'hide','res.bone':'bone','res.silk':'silk','res.spore':'spores',
  'res.ecto':'ectoplasm','res.crystal':'crystal','res.silver':'silver','res.ironwood':'ironwood','res.amber':'amber heart','res.pearl':'moon pearl','res.starice':'star ice',
  'mage.stats':'Damage {d}/s · health {h} · xp {x}/{n}',
  'st.road':'On a trip: {t}, wave {w}. Bag {n}/{c}.','st.sleep':'Asleep. Wakes up in {t}.','st.home':'Home, getting ready.',
  'plan.title':'TRIP PLAN','plan.hint':'Set how many times to run each tract. The mage follows the plan top to bottom and sleeps between trips when tired. When the plan is done, the last tract repeats.',
  'plan.left':'Trips left in the plan: {n}','plan.empty':'Plan is empty: the mage runs {t}','plan.times':'x{n}','plan.goNow':'Next trip: {t}',
  'opt.cautious':'CAUTION','opt.cautiousD':'Before a boss the mage estimates the fight. If it is a loss, he goes home with the bag instead of losing it.',
  'opt.auto':'AUTO TRIPS','opt.autoD':'After coming home and sleeping, the mage sets out on the next trip by himself.',
  'store.title':'STORE','store.cap':'Holds up to {n} of each resource. Extra is lost when the bag is unpacked.','store.bag':'IN THE BAG: {n}/{c}','st.none':'empty',
  'jr.title':'TRIP LOG','jr.empty':'No trips yet.','jr.wave':'wave {w}','jr.lost':'lost {n}',
  'work.hint':'There are no craftsmen in the tavern yet, so the mage upgrades gear himself from the store. In the next version this moves to the craftsmen.',
  'work.staff':'STAFF','work.staffI':'Staff damage {v}/s, next level {n}/s','work.tier':'Tier {n}. Next at lv. {l}, needs a rare resource.',
  'work.bag':'BAG','work.bagI':'Holds {c}, pickup {p}','work.next':'next: {s}','work.bagS':'With a small bag the mage leaves things behind. A big bag means higher chance, and more to lose on defeat.',
  'work.store':'STORE','work.storeI':'Up to {c} of each resource',
  'sk.points':'Skill points: {n}. One point per mage level.','sk.pts':'{n} pt','sk.locked':'Unlocks at mage level {n}','sk.lockedShort':'LV. {n}',
  'sk.harvest.d':'Drop chance x{p} for {d} s',
  'wd2.about8':'There is no gold in the game yet, so wardrobe items unlock for free with mage level. Prices return with the tavern.',
  'st.trips':'Trips','st.gathered':'Resources brought home','st.lostBags':'Bags lost','st.lostItems':'Resources lost','st.clears':'Tracts cleared','st.rest':'Asleep',
  'off.trips':'Trips: {n}','off.sleep':'Slept: {t}','off.got':'BROUGHT HOME','off.lost':'Bags lost: {n} ({i} items)','off.over':'Did not fit the store: {n}','off.lvl':'Mage level: {a} -> {b}',
  'toast.tract':'New tract open: {t}','toast.level':'Mage level {n}','toast.item':'Unlocked in the wardrobe: {s}',
  'mig.title':'NEW VERSION',
  'mig.body':'<p>The game has been reworked: monsters now drop resources, not gold. They go into the bag and reach the store when the mage comes home. Lose to a boss and the bag is lost.</p><p>Your character, look and wardrobe are kept, progress starts over.</p><p>Trip plan and caution are in the PATH tab.</p>'
});
/* v8b: таверна */
I18n.add('ru',{
  'tab.tavern':'ТАВЕРНА','tab.masters':'МАСТЕРА','tab.gear':'МАГ',
  'res.coal':'уголь',
  'tv.open':'ОТКРЫТО','tv.closed':'ЗАКРЫТО: МАГ СПИТ','tv.info':'Путников в час: около {r}, ждать могут {m}. Репутация {rep}.',
  'tv.cust':'ПОКУПАТЕЛИ','tv.noCust':'Пока никого. Путники заходят сами, чаще с большим залом и хорошей репутацией.','tv.night':'Ночью таверна закрыта. Мастера доделывают заказы.',
  'tv.hostessIn':'хозяйка продаст сама через {s} с','tv.leaveIn':'уйдёт через {t}','tv.wants':'Хочет:','tv.stock':'на складе {n}',
  'tv.sell':'ПРОДАТЬ','tv.up':'ДОРОЖЕ','tv.down':'СКИДКА','tv.no':'НЕТ',
  'tv.hint':'Дороже: +30% к цене, но с шансом {p}% покупатель уйдёт. Скидка: -20%, зато растёт репутация. Если не ответить, хозяйка продаст по обычной цене.',
  'tv.sold':'Продано: {r} за {g}','tv.left':'Покупатель ушёл: слишком дорого.',
  'mine.title':'ШАХТА','mine.desc':'Шахта добывает уголь, его нет в походах. Без угля кузнец не работает.','mine.info':'Уголь: {r} в минуту, вагонетки вмещают {c}.',
  'mine.collect':'ЗАБРАТЬ','mine.full':'Вагонетки полные, шахта стоит. Забери уголь.','mine.got':'Уголь на складе: +{n}',
  'mine.next':'Добыча {a} -> {b} в минуту','mine.buyI':'Купить шахту: уголь для кузнеца','buy.buy':'КУПИТЬ','buy.build':'ПОСТРОИТЬ',
  'bd.title':'ПОСТРОЙКИ','bd.hall':'ЗАЛ','bd.hall.d':'Путников в час / мест: {v}','bd.bedroom':'СПАЛЬНЯ','bd.bedroom.d':'Сон: {v} ч (минимум 6)',
  'bd.decor':'УБРАНСТВО','bd.decor.d':'Цены выше на {v}%','bd.forge':'КУЗНЯ','bd.forge.d':'Место для кузнеца','bd.tannery':'ДУБИЛЬНЯ','bd.tannery.d':'Место для кожевника',
  'bd.jewelry':'ЮВЕЛИРНАЯ','bd.jewelry.d':'Место для ювелира',
  'ms.herbalist':'ТРАВНИЦА','ms.carpenter':'СТОЛЯР','ms.smith':'КУЗНЕЦ','ms.tanner':'КОЖЕВНИК','ms.jeweler':'ЮВЕЛИР',
  'ms.herbalist.d':'Варит зелья. Их пьёт маг в походе или покупают путники.','ms.carpenter.d':'Работает с деревом. Улучшает посох и полки склада, делает товар.',
  'ms.smith.d':'Куёт из железа и угля: товар и железную броню.','ms.tanner.d':'Шьёт из кожи и шёлка: броню и новую сумку.','ms.jeweler.d':'Амулеты из кости, кристаллов и редких ресурсов.',
  'ms.lvl':'ур. {n}','ms.notHired':'не нанят','ms.needBuild':'Сначала нужна постройка: {b}','ms.hire':'НАНЯТЬ','ms.hired':'Нанят: {m}',
  'ms.stats':'Скорость {s}% · опыт {x}/{n} · обычных вещей {q}%, остальное лучше','ms.queue':'ОЧЕРЕДЬ {n}/{m}','ms.idle':'Мастер без дела.',
  'ms.after':'через {t}','ms.cancel':'Отменить, ресурсы вернутся','ms.order':'ЗАКАЗАТЬ','ms.pending':'В РАБОТЕ','ms.full':'ОЧЕРЕДЬ',
  'ms.teacher':'УЧИТЕЛЬ','ms.teacherD':'Новые вещи мастер делает, только когда его научат. Учитель берёт золото и приходит, когда мастер дорос до нужного уровня.',
  'ms.allKnown':'Мастер знает всё, чему здесь можно научить.','ms.needLvl':'нужен ур. {n}','ms.learn':'УЧИТЬ','ms.learned':'Новый рецепт: {r}',
  'ms.tools':'ИНСТРУМЕНТЫ','ms.toolsI':'+10% к скорости за уровень','ms.slots':'ОЧЕРЕДЬ','ms.slotsI':'Сколько заказов можно поставить за раз',
  'ms.qual':'{m}: {r}, {q}','ms.lvlUp':'{m}: уровень {n}',
  'ord.staff':'Посох ур. {n}','ord.bag':'Сумка ур. {n}','ord.store':'Склад ур. {n}','ord.staffMax':'Посох: максимум','ord.bagMax':'Сумка: максимум','ord.storeMax':'Склад: максимум',
  'ord.done.staff':'Посох улучшен: ур. {n}','ord.done.bag':'Новая сумка: ур. {n}','ord.done.store':'Склад расширен: ур. {n}',
  'it.p_str':'Зелье силы','it.p_luck':'Зелье удачи','it.p_vigor':'Зелье бодрости','it.p_hp':'Зелье стойкости','it.p_ward':'Оберег сумки','it.p_spore':'Эликсир спор',
  'it.c_shaft':'Древко','it.c_bow':'Охотничий лук','it.c_shield':'Деревянный щит','it.c_wand':'Посох ученика',
  'it.s_axe':'Простой топор','it.s_sword':'Меч','it.s_helm':'Железный шлем','it.s_mail':'Кольчуга','it.s_blade':'Серебряный клинок',
  'it.t_gloves':'Кожаные перчатки','it.t_boots':'Сапоги','it.t_hood':'Капюшон следопыта','it.t_cloak':'Шёлковый плащ',
  'it.j_bone':'Костяной амулет','it.j_crys':'Кристальный амулет','it.j_amber':'Янтарный оберег','it.j_star':'Звёздное кольцо',
  'q.1':'хорошее','q.2':'отличное','q.3':'шедевр',
  'eff.dmg':'урон +{v}%','eff.hp':'здоровье +{v}%','eff.chance':'шанс ресурса +{v}%','eff.pick':'подбор +{v}%','eff.crit':'крит +{v}%','eff.fat':'устаёт медленнее на {v}%',
  'eff.ward':'при поражении сохраняет половину сумки',
  'trav.0':'Караванщик','trav.1':'Охотница','trav.2':'Наёмник','trav.3':'Травница','trav.4':'Паломник','trav.5':'Купец с юга',
  'trav.6':'Стражница','trav.7':'Рыбак','trav.8':'Бродячий бард','trav.9':'Кузнечиха из деревни','trav.10':'Старый рудокоп','trav.11':'Гонец',
  'gear.stats':'МАГ','gear.statsI':'Урон {d}/с · здоровье {h} · крит {c}% · подбор {p}% · в пути до {a} ч · сон {r} ч',
  'gear.needM':'Нужен мастер: {m}','gear.byM':'Делает {m}, примерно {t}','gear.order':'ЗАКАЗАТЬ',
  'gear.equip':'НАДЕТО','gear.off':'снять','gear.on':'НАДЕТЬ','gear.empty':'пусто',
  'gear.potions':'ЗЕЛЬЯ В ПОХОД','gear.potionsD':'Отмеченные зелья маг берёт по одному в начале похода, лучшего качества. Действуют весь поход. Оберег сумки тратится только при поражении.',
  'gear.drank':'В этом походе выпито: {s}',
  'slot8.head':'ГОЛОВА','slot8.body':'ТЕЛО','slot8.hands':'РУКИ','slot8.feet':'НОГИ','slot8.amulet':'АМУЛЕТ',
  'store.items':'ИЗДЕЛИЯ','store.noItems':'Пока ничего. Изделия делают мастера во вкладке МАСТЕРА.',
  'st.crafted':'Сделано мастерами','st.sold':'Продано вещей','st.goldEarned':'Заработано золота',
  'off.crafted':'Мастера сделали: {n}','off.sold':'Продано вещей: {n}, золота: {g}',
  'wd2.about8':'Вещи гардероба открываются уровнем мага и покупаются за золото таверны.',
  'view.tavern':'ТАВЕРНА','view.road':'ДОРОГА','view.loading':'ЗАГРУЗКА {p}%','lbl.idle':'без дела','lbl.hostess':'ХОЗЯЙКА','lbl.cust':'ждут {n}',
  'v8b.title':'ТАВЕРНА',
  'v8b.body':'<p>Таверна теперь твоя. Мастера делают вещи из ресурсов, путники их покупают. Это единственный источник золота.</p><p>Травница уже работает. Столяра можно нанять сразу: он улучшает посох и склад. Кузне нужен уголь из шахты.</p><p>Ночью, пока маг спит, таверна закрыта, но мастера доделывают заказы.</p>'
});
I18n.add('en',{
  'tab.tavern':'TAVERN','tab.masters':'CRAFTSMEN','tab.gear':'GEAR',
  'res.coal':'coal',
  'tv.open':'OPEN','tv.closed':'CLOSED: THE MAGE IS ASLEEP','tv.info':'Travelers per hour: about {r}, up to {m} can wait. Reputation {rep}.',
  'tv.cust':'CUSTOMERS','tv.noCust':'Nobody yet. Travelers drop in on their own, more often with a bigger hall and good reputation.','tv.night':'The tavern is closed at night. The craftsmen finish their orders.',
  'tv.hostessIn':'the hostess sells in {s} s','tv.leaveIn':'leaves in {t}','tv.wants':'Wants:','tv.stock':'in stock {n}',
  'tv.sell':'SELL','tv.up':'PRICIER','tv.down':'DISCOUNT','tv.no':'NO',
  'tv.hint':'Pricier: +30%, but a {p}% chance the customer walks away. Discount: -20%, reputation grows. If you do not answer, the hostess sells at the normal price.',
  'tv.sold':'Sold: {r} for {g}','tv.left':'The customer left: too expensive.',
  'mine.title':'MINE','mine.desc':'The mine produces coal, which trips do not give. The smith cannot work without it.','mine.info':'Coal: {r} per minute, carts hold {c}.',
  'mine.collect':'COLLECT','mine.full':'The carts are full and the mine has stopped. Collect the coal.','mine.got':'Coal to the store: +{n}',
  'mine.next':'Output {a} -> {b} per minute','mine.buyI':'Buy the mine: coal for the smith','buy.buy':'BUY','buy.build':'BUILD',
  'bd.title':'BUILDINGS','bd.hall':'HALL','bd.hall.d':'Travelers per hour / places: {v}','bd.bedroom':'BEDROOM','bd.bedroom.d':'Sleep: {v} h (minimum 6)',
  'bd.decor':'DECOR','bd.decor.d':'Prices higher by {v}%','bd.forge':'FORGE','bd.forge.d':'A place for the smith','bd.tannery':'TANNERY','bd.tannery.d':'A place for the tanner',
  'bd.jewelry':'JEWELRY','bd.jewelry.d':'A place for the jeweler',
  'ms.herbalist':'HERBALIST','ms.carpenter':'CARPENTER','ms.smith':'SMITH','ms.tanner':'TANNER','ms.jeweler':'JEWELER',
  'ms.herbalist.d':'Brews potions. The mage drinks them on trips or travelers buy them.','ms.carpenter.d':'Works wood. Upgrades the staff and store shelves, makes goods.',
  'ms.smith.d':'Forges from iron and coal: goods and iron armor.','ms.tanner.d':'Sews hide and silk: armor and a new bag.','ms.jeweler.d':'Amulets from bone, crystals and rare resources.',
  'ms.lvl':'lv. {n}','ms.notHired':'not hired','ms.needBuild':'Needs a building first: {b}','ms.hire':'HIRE','ms.hired':'Hired: {m}',
  'ms.stats':'Speed {s}% · xp {x}/{n} · common items {q}%, the rest better','ms.queue':'QUEUE {n}/{m}','ms.idle':'The craftsman is idle.',
  'ms.after':'in {t}','ms.cancel':'Cancel, resources come back','ms.order':'ORDER','ms.pending':'IN WORK','ms.full':'QUEUE',
  'ms.teacher':'TEACHER','ms.teacherD':'A craftsman makes new things only after being taught. The teacher takes gold and comes when the craftsman reaches the required level.',
  'ms.allKnown':'The craftsman knows everything that can be taught here.','ms.needLvl':'needs lv. {n}','ms.learn':'LEARN','ms.learned':'New recipe: {r}',
  'ms.tools':'TOOLS','ms.toolsI':'+10% speed per level','ms.slots':'QUEUE','ms.slotsI':'How many orders can be placed at once',
  'ms.qual':'{m}: {r}, {q}','ms.lvlUp':'{m}: level {n}',
  'ord.staff':'Staff lv. {n}','ord.bag':'Bag lv. {n}','ord.store':'Store lv. {n}','ord.staffMax':'Staff: max','ord.bagMax':'Bag: max','ord.storeMax':'Store: max',
  'ord.done.staff':'Staff upgraded: lv. {n}','ord.done.bag':'New bag: lv. {n}','ord.done.store':'Store expanded: lv. {n}',
  'it.p_str':'Potion of strength','it.p_luck':'Potion of luck','it.p_vigor':'Potion of vigor','it.p_hp':'Potion of fortitude','it.p_ward':'Bag ward','it.p_spore':'Spore elixir',
  'it.c_shaft':'Shaft','it.c_bow':'Hunting bow','it.c_shield':'Wooden shield','it.c_wand':'Apprentice staff',
  'it.s_axe':'Simple axe','it.s_sword':'Sword','it.s_helm':'Iron helmet','it.s_mail':'Chainmail','it.s_blade':'Silver blade',
  'it.t_gloves':'Leather gloves','it.t_boots':'Boots','it.t_hood':'Ranger hood','it.t_cloak':'Silk cloak',
  'it.j_bone':'Bone amulet','it.j_crys':'Crystal amulet','it.j_amber':'Amber charm','it.j_star':'Star ring',
  'q.1':'good','q.2':'fine','q.3':'masterpiece',
  'eff.dmg':'damage +{v}%','eff.hp':'health +{v}%','eff.chance':'drop chance +{v}%','eff.pick':'pickup +{v}%','eff.crit':'crit +{v}%','eff.fat':'tires {v}% slower',
  'eff.ward':'keeps half the bag on defeat',
  'trav.0':'Caravan driver','trav.1':'Huntress','trav.2':'Mercenary','trav.3':'Herbalist','trav.4':'Pilgrim','trav.5':'Southern merchant',
  'trav.6':'Guardswoman','trav.7':'Fisherman','trav.8':'Wandering bard','trav.9':'Village smith','trav.10':'Old miner','trav.11':'Courier',
  'gear.stats':'MAGE','gear.statsI':'Damage {d}/s · health {h} · crit {c}% · pickup {p}% · on the road up to {a} h · sleep {r} h',
  'gear.needM':'Needs a craftsman: {m}','gear.byM':'Made by the {m}, about {t}','gear.order':'ORDER',
  'gear.equip':'EQUIPPED','gear.off':'remove','gear.on':'EQUIP','gear.empty':'empty',
  'gear.potions':'POTIONS FOR TRIPS','gear.potionsD':'The mage takes one of each checked potion at the start of a trip, best quality first. They last the whole trip. The bag ward is spent only on defeat.',
  'gear.drank':'Drunk on this trip: {s}',
  'slot8.head':'HEAD','slot8.body':'BODY','slot8.hands':'HANDS','slot8.feet':'FEET','slot8.amulet':'AMULET',
  'store.items':'ITEMS','store.noItems':'Nothing yet. Craftsmen make items in the CRAFTSMEN tab.',
  'st.crafted':'Crafted','st.sold':'Items sold','st.goldEarned':'Gold earned',
  'off.crafted':'Crafted: {n}','off.sold':'Items sold: {n}, gold: {g}',
  'wd2.about8':'Wardrobe items unlock with mage level and cost tavern gold.',
  'view.tavern':'TAVERN','view.road':'ROAD','view.loading':'LOADING {p}%','lbl.idle':'idle','lbl.hostess':'HOSTESS','lbl.cust':'{n} waiting',
  'v8b.title':'TAVERN',
  'v8b.body':'<p>The tavern is yours now. Craftsmen make items from resources and travelers buy them. This is the only source of gold.</p><p>The herbalist is already working. The carpenter can be hired right away: he upgrades the staff and the store. The forge needs coal from the mine.</p><p>At night, while the mage sleeps, the tavern is closed, but the craftsmen finish their orders.</p>'
});

/* v10: дорога и таверна раздельно, крафт с картинками, мастера как в гардеробе */
I18n.add('ru',{
  'tab.bag':'СУМКА','tab.craft':'КРАФТ','tab.city':'ГОРОД','tab.tavern':'ТАВЕРНА','tab.path':'ПУТЬ','tab.store':'СКЛАД','tab.gear':'МАГ',
  'go.tavern':'В ТАВЕРНУ','go.trip':'В ПОХОД','rest.wake':'РАЗБУДИТЬ','btn.sleep':'СПАТЬ',
  'st.paused':'В таверне. Поход по тракту «{t}» ждёт на волне {w}','st.home':'В таверне',
  'why.pause':'ушёл в таверну','why.tired':'устал, ушёл в таверну',
  'mage.xp':'опыт {x}/{n}',
  'trd.dmg':'УРОН','trd.lvl':'УРОВЕНЬ','trd.chance':'ШАНС ДОБЫЧИ','trd.best':'ЛУЧШАЯ ВОЛНА',
  'plan.hint2':'Пройдя план, маг идёт дальше сам.',
  'bag.title':'СУМКА {n}/{c}','bag.empty':'Сумка пуста.','bag.info':'Шанс добычи с врага: x{p}. В таверне маг выгружает сумку на склад.',
  'tv.rate':'{r} путников/ч','tv.rep':'репутация {n}','tv.soldN':'продано {n}',
  'tv.upT':'Попросить больше. Шанс {p}%, что уйдёт','tv.downT':'Скидка: дешевле, но плюс к репутации',
  'store.noItems':'Пока ничего. Вещи заказывают во вкладке КРАФТ.','cr2.make':'КРАФТ','cr2.goods':'ВЕЩИ','cr2.ups':'УЛУЧШЕНИЯ: ПОСОХ, СУМКА, СКЛАД','cr2.masters':'МАСТЕРА','cr2.pick':'Выбери вещь, чтобы увидеть цену и время.',
  'cr2.time':'время','cr2.price':'продажа','cr2.do':'СДЕЛАТЬ',
  'cr2.hireFirst':'НАНЯТЬ: {m}','cr2.teach':'ПОЗВАТЬ УЧИТЕЛЯ ({g})','cr2.needLvl':'{m}: НУЖЕН УР. {n}',
  'cr2.block.teaching':'МАСТЕР УЧИТСЯ','cr2.block.full':'ОЧЕРЕДЬ ПОЛНАЯ','cr2.block.cost':'НЕ ХВАТАЕТ','cr2.block.hire':'НЕ НАНЯТ',
  'cr2.block.unknown':'НЕ ЗНАЕТ','cr2.block.pending':'УЖЕ В РАБОТЕ','cr2.block.max':'МАКСИМУМ','cr2.block.no':'НЕ ЕГО',
  'ms3.teach':'учится','ms3.busy':'работает {n}/{m}','ms3.hint':'Нажми на мастера: его вещи, очередь, учитель и улучшения.',
  'mine.rate':'{r} угля/ч','store.capS':'до {n} каждого',
  'gear.crit':'крит {c}%','gear.pick':'добыча {p}%','gear.can':'МОЖНО НАДЕТЬ','gear.potionsD2':'Отмеченные зелья маг берёт с собой в поход, по одному.',
  'slot8.belt':'ПОЯС','slot8.ring':'КОЛЬЦО',
  'qb.teach':'учёба','qb.empty':'мастера свободны: нажми, чтобы заказать',
  'ms2.title':'МАСТЕРА','ms2.close':'ЗАКРЫТЬ','ms2.teaching':'Учит: {r}, ещё {t}','ms2.busy':'Делает: {r}, ещё {t}',
  'ms2.canMake':'УМЕЕТ ДЕЛАТЬ','ms2.make':'СДЕЛАТЬ','ms2.do':'ЗАКАЗАТЬ','ms2.upgrades':'УЛУЧШЕНИЯ','ms2.studying':'УЧИТСЯ',
  'ms2.teacherD':'Учитель приходит за золото, когда мастер дорос до уровня вещи.','ms2.teachNote':'Пока идёт учёба, мастер не работает.',
  'ms.herbalist.d':'Варит зелья для похода и на продажу.','ms.carpenter.d':'Дерево: луки, посох мага, полки склада.',
  'ms.smith.d':'Железо: мечи, топоры, броня.','ms.tanner.d':'Кожа: плащи, пояса, сапоги, новая сумка.','ms.jeweler.d':'Кольца и амулеты.',
  'it.p_heal':'Зелье здоровья','it.t_cloak':'Кожаный плащ','it.t_belt':'Кожаный пояс','it.t_silk':'Шёлковая мантия','it.j_ring':'Железное кольцо',
  'desc.p_heal':'Простое зелье. Маг крепче в походе, путники берут охотно.',
  'desc.p_str':'Маг бьёт сильнее весь поход.','desc.p_luck':'Чаще падает добыча.','desc.p_vigor':'Маг устаёт медленнее.',
  'desc.p_ward':'Если маг проиграет боссу, сумка не пропадёт.','desc.p_spore':'Сильное зелье из болотных спор.',
  'desc.c_bow':'Охотничий лук. Ходовой товар.','desc.c_shield':'Деревянный щит для путников.','desc.c_wand':'Жезл из железного дерева. Дорогой товар.',
  'desc.s_sword':'Простой меч. Путники покупают в дорогу.','desc.s_axe':'Топор на угле. Крепче и дороже меча.',
  'desc.s_helm':'Шлем для мага.','desc.s_mail':'Кольчуга для мага.','desc.s_blade':'Клинок высшей ковки. Очень дорогой товар.',
  'desc.t_cloak':'Плащ из кожи. Маг его может надеть.','desc.t_belt':'Пояс с карманами: больше влезает добычи.',
  'desc.t_boots':'Сапоги: маг меньше устаёт в дороге.','desc.t_hood':'Капюшон следопыта.','desc.t_silk':'Лёгкая мантия из шёлка.',
  'desc.j_ring':'Железное кольцо: чаще критический удар.','desc.j_bone':'Кольцо из кости.','desc.j_crys':'Кристалл: больше добычи.',
  'desc.j_amber':'Янтарь: маг дольше не устаёт.','desc.j_star':'Звёздный лёд: много урона.',
  'desc.staff':'Посох мага: больше урона в походе.','desc.store':'Полки склада: больше каждого ресурса.','desc.bag':'Сумка: больше добычи за поход.',
  'v10.title':'ОБНОВЛЕНИЕ',
  'v10.body':'<p>Дорога и таверна теперь отдельно. В походе: путь, сумка, умения, гардероб. В таверне: продажи, крафт, город, склад, снаряжение.</p><p>Кнопка «В ТАВЕРНУ» сверху уводит мага домой. «В ПОХОД» продолжает тот же тракт с той же волны.</p><p>Крафт с картинками. Мастера в своей вкладке: их вещи, очередь, учитель. Пока мастер учится, он не работает.</p><p>Вещи первого уровня известны сразу: зелье, лук, меч, плащ, пояс, сапоги, кольцо.</p>',
  'v8b.body':'<p>Таверна твоя. Мастера делают вещи из ресурсов, путники их покупают. Это единственный источник золота.</p><p>На складе уже есть немного ресурсов: можно сразу заказать первые вещи во вкладке КРАФТ.</p><p>Кнопка «В ТАВЕРНУ» сверху уводит мага домой, «В ПОХОД» продолжает путь с той же волны. Ночью, пока маг спит, таверна закрыта, но мастера доделывают заказы.</p>'
});

I18n.add('en',{
  'tab.bag':'BAG','tab.craft':'CRAFT','tab.city':'TOWN','tab.tavern':'TAVERN','tab.path':'ROAD','tab.store':'STORE','tab.gear':'MAGE',
  'go.tavern':'TO TAVERN','go.trip':'ON A TRIP','rest.wake':'WAKE UP','btn.sleep':'SLEEP',
  'st.paused':'In the tavern. The trip on {t} waits at wave {w}','st.home':'In the tavern',
  'why.pause':'went to the tavern','why.tired':'tired, went to the tavern',
  'mage.xp':'xp {x}/{n}',
  'trd.dmg':'DAMAGE','trd.lvl':'LEVEL','trd.chance':'LOOT CHANCE','trd.best':'BEST WAVE',
  'plan.hint2':'After the plan the mage moves on alone.',
  'bag.title':'BAG {n}/{c}','bag.empty':'The bag is empty.','bag.info':'Loot chance from enemies: x{p}. In the tavern the mage unpacks the bag into the store.',
  'tv.rate':'{r} travelers/h','tv.rep':'reputation {n}','tv.soldN':'sold {n}',
  'tv.upT':'Ask for more. {p}% chance they leave','tv.downT':'Discount: cheaper, but adds reputation',
  'store.noItems':'Nothing yet. Order items in the CRAFT tab.','cr2.make':'CRAFT','cr2.goods':'ITEMS','cr2.ups':'UPGRADES: STAFF, BAG, STORE','cr2.masters':'CRAFTSMEN','cr2.pick':'Pick an item to see its cost and time.',
  'cr2.time':'time','cr2.price':'sells for','cr2.do':'MAKE',
  'cr2.hireFirst':'HIRE: {m}','cr2.teach':'CALL TEACHER ({g})','cr2.needLvl':'{m}: NEEDS LV {n}',
  'cr2.block.teaching':'STUDYING','cr2.block.full':'QUEUE FULL','cr2.block.cost':'NOT ENOUGH','cr2.block.hire':'NOT HIRED',
  'cr2.block.unknown':'UNKNOWN','cr2.block.pending':'IN PROGRESS','cr2.block.max':'MAXED','cr2.block.no':'NOT THEIRS',
  'ms3.teach':'studying','ms3.busy':'working {n}/{m}','ms3.hint':'Tap a craftsman: items, queue, teacher and upgrades.',
  'mine.rate':'{r} coal/h','store.capS':'up to {n} each',
  'gear.crit':'crit {c}%','gear.pick':'loot {p}%','gear.can':'CAN WEAR','gear.potionsD2':'The mage takes one of each checked potion on a trip.',
  'slot8.belt':'BELT','slot8.ring':'RING',
  'qb.teach':'study','qb.empty':'craftsmen are free: tap to order',
  'ms2.title':'CRAFTSMEN','ms2.close':'CLOSE','ms2.teaching':'Studying: {r}, {t} left','ms2.busy':'Making: {r}, {t} left',
  'ms2.canMake':'CAN MAKE','ms2.make':'MAKE','ms2.do':'ORDER','ms2.upgrades':'UPGRADES','ms2.studying':'STUDYING',
  'ms2.teacherD':'A teacher comes for gold once the craftsman reaches the item level.','ms2.teachNote':'While studying, the craftsman does not work.',
  'ms.herbalist.d':'Brews potions for trips and for sale.','ms.carpenter.d':'Wood: bows, the mage staff, store shelves.',
  'ms.smith.d':'Iron: swords, axes, armor.','ms.tanner.d':'Hide: cloaks, belts, boots, a new bag.','ms.jeweler.d':'Rings and amulets.',
  'it.p_heal':'Health potion','it.t_cloak':'Leather cloak','it.t_belt':'Leather belt','it.t_silk':'Silk robe','it.j_ring':'Iron ring',
  'desc.p_heal':'A simple potion. The mage is tougher on trips, travelers buy it gladly.',
  'desc.p_str':'The mage hits harder for the whole trip.','desc.p_luck':'Loot drops more often.','desc.p_vigor':'The mage tires slower.',
  'desc.p_ward':'If the mage loses to a boss, the bag is kept.','desc.p_spore':'A strong potion of swamp spores.',
  'desc.c_bow':'Hunting bow. Sells well.','desc.c_shield':'Wooden shield for travelers.','desc.c_wand':'Ironwood wand. Expensive goods.',
  'desc.s_sword':'A plain sword. Travelers buy it for the road.','desc.s_axe':'Coal-forged axe. Tougher and pricier than a sword.',
  'desc.s_helm':'A helmet for the mage.','desc.s_mail':'Chain mail for the mage.','desc.s_blade':'Master-forged blade. Very expensive.',
  'desc.t_cloak':'Leather cloak. The mage can wear it.','desc.t_belt':'Belt with pouches: more loot fits.',
  'desc.t_boots':'Boots: the mage tires less on the road.','desc.t_hood':'Ranger hood.','desc.t_silk':'Light silk robe.',
  'desc.j_ring':'Iron ring: more critical hits.','desc.j_bone':'Bone ring.','desc.j_crys':'Crystal: more loot.',
  'desc.j_amber':'Amber: the mage stays fresh longer.','desc.j_star':'Star ice: a lot of damage.',
  'desc.staff':'Mage staff: more damage on trips.','desc.store':'Store shelves: more of each resource.','desc.bag':'Bag: more loot per trip.',
  'v10.title':'UPDATE',
  'v10.body':'<p>Road and tavern are separate now. On the road: route, bag, skills, wardrobe. In the tavern: sales, craft, town, store, gear.</p><p>The TO TAVERN button at the top brings the mage home. ON A TRIP continues the same tract from the same wave.</p><p>Craft has pictures. Craftsmen have their own view: items, queue, teacher. A studying craftsman does not work.</p><p>Level one items are known from the start: potion, bow, sword, cloak, belt, boots, ring.</p>',
  'v8b.body':'<p>The tavern is yours. Craftsmen make items from resources and travelers buy them. This is the only source of gold.</p><p>The store already has some resources: order your first items in the CRAFT tab.</p><p>TO TAVERN at the top brings the mage home, ON A TRIP continues from the same wave. At night, while the mage sleeps, the tavern is closed, but craftsmen finish their orders.</p>'
});

/* v11: общая очередь, свитки мага, поток путников */
I18n.add('ru',{
  'tv.rate':'{r} путников/мин','bd.hall.d':'Путников в минуту / мест: {v}',
  'q2.title':'ОЧЕРЕДЬ {n}/{m}','q2.short':'очередь {n}/{m}','q2.cancel':'нажми, чтобы отменить','q2.more':'+ МЕСТО','q2.max':'очередь уже максимальная',
  'q2.hint':'Одна очередь на всех. Каждый мастер берёт первую свою вещь, мастера работают одновременно. Нажми на вещь в очереди, чтобы отменить.',
  'q2.canceled':'Заказ отменён, ресурсы вернулись','q2.slots':'МЕСТА В ОЧЕРЕДИ','q2.slotsI':'Общая очередь всех мастеров и мага',
  'cr2.xp':'опыт мага','cr2.free':'без ресурсов','cr2.needMage':'НУЖЕН УР. МАГА {n}','cr2.mLvl':'ур. мага {n}','cr2.scrolls':'СВИТКИ МАГА',
  'cr2.mageHome':'Маг пишет свитки, пока он в таверне.','cr2.mageAway':'Маг в походе или спит: свиток ждёт в очереди, пока маг не вернётся.',
  'cr2.block.no':'НЕ ЕГО','ms.mage':'МАГ','ms3.busy2':'в очереди {n}',
  'it.sc_spark':'Свиток искры','it.sc_guard':'Свиток оберега','it.sc_wind':'Свиток попутного ветра','it.sc_seek':'Свиток поиска',
  'it.sc_fire':'Огненный свиток','it.sc_storm':'Свиток бури','it.sc_star':'Звёздный свиток',
  'desc.sc_spark':'Простой свиток. Маг пишет его без ресурсов и получает опыт.','desc.sc_guard':'Защитные знаки. Без ресурсов, даёт опыт.',
  'desc.sc_wind':'В пути маг меньше устаёт.','desc.sc_seek':'С врагов чаще падает добыча.','desc.sc_fire':'Сильный урон весь поход.',
  'desc.sc_storm':'Урон и критические удары.','desc.sc_star':'Самый сильный свиток мага.'
});
I18n.add('en',{
  'tv.rate':'{r} travelers/min','bd.hall.d':'Travelers per minute / places: {v}',
  'q2.title':'QUEUE {n}/{m}','q2.short':'queue {n}/{m}','q2.cancel':'tap to cancel','q2.more':'+ SLOT','q2.max':'queue is at maximum',
  'q2.hint':'One queue for everyone. Each craftsman takes his first item, craftsmen work at the same time. Tap an item in the queue to cancel it.',
  'q2.canceled':'Order canceled, resources returned','q2.slots':'QUEUE SLOTS','q2.slotsI':'Shared queue of all craftsmen and the mage',
  'cr2.xp':'mage xp','cr2.free':'no resources','cr2.needMage':'NEEDS MAGE LV {n}','cr2.mLvl':'mage lv {n}','cr2.scrolls':'MAGE SCROLLS',
  'cr2.mageHome':'The mage writes scrolls while he is in the tavern.','cr2.mageAway':'The mage is on a trip or asleep: the scroll waits in the queue until he is back.',
  'cr2.block.no':'NOT THEIRS','ms.mage':'MAGE','ms3.busy2':'{n} queued',
  'it.sc_spark':'Spark scroll','it.sc_guard':'Ward scroll','it.sc_wind':'Tailwind scroll','it.sc_seek':'Seeking scroll',
  'it.sc_fire':'Fire scroll','it.sc_storm':'Storm scroll','it.sc_star':'Star scroll',
  'desc.sc_spark':'A simple scroll. The mage writes it without resources and gains xp.','desc.sc_guard':'Protective signs. No resources, gives xp.',
  'desc.sc_wind':'The mage tires less on the road.','desc.sc_seek':'Enemies drop loot more often.','desc.sc_fire':'Strong damage for the whole trip.',
  'desc.sc_storm':'Damage and critical hits.','desc.sc_star':'The strongest mage scroll.'
});

/* v12: имена врагов под новые модели */
I18n.add('ru',{
  'mon.wood':'ДРЕВЕСНЫЙ ЗМЕЙ','mon.iron':'ОРК-РУДОКОП','mon.herb':'ТРАВЯНАЯ ЖАБА','mon.hide':'КРОЛИК-ГРОМИЛА',
  'mon.bone':'КОСТОГРЫЗ','mon.silk':'ПАУК-ТКАЧ','mon.spore':'СПОРОВАЯ ОСА','mon.crystal':'ЛЕДЯНОЙ БЕС','mon.silver':'СЕРЕБРИСТЫЙ ЙЕТИ',
  'boss.summer':'ВОЖДЬ ОРКОВ','boss.pass':'ДЕМОН ПЕРЕВАЛА'
});
I18n.add('en',{
  'mon.wood':'TREE SNAKE','mon.iron':'ORC MINER','mon.herb':'HERB TOAD','mon.hide':'BRUTE BUNNY',
  'mon.bone':'BONE GNAWER','mon.silk':'WEAVER SPIDER','mon.spore':'SPORE WASP','mon.crystal':'ICE IMP','mon.silver':'SILVER YETI',
  'boss.summer':'ORC CHIEFTAIN','boss.pass':'DEMON OF THE PASS'
});

/* v12.1: быстрый заказ */
I18n.add('ru',{'cr2.ordered':'В очереди: {r}','cr2.hint2':'Нажми на вещь ещё раз, чтобы сразу заказать'});
I18n.add('en',{'cr2.ordered':'Queued: {r}','cr2.hint2':'Tap an item again to order it right away'});

/* v13: качество, освоение, коллекции, инструменты */
I18n.add('ru',{
  'q.0':'обычное','q.1':'хорошее','q.2':'безупречное','q.3':'легендарное',
  'ms.toolsI':'Шанс хорошего +0.6% и безупречного +0.4% за уровень',
  'cr2.mastery':'освоено {n}/{m}','cr2.faster':'работа руками быстрее на {p}%',
  'coll.title':'КОЛЛЕКЦИЯ {n}/{m}','coll.info':'Отдай по одной вещи каждого рецепта мастера. Собранная коллекция: легендарное +2%, скорость +10%, цена +10%.',
  'coll.doneI':'Коллекция собрана: легендарное +2%, скорость +10%, цена +10%.','coll.add':'В КОЛЛЕКЦИЮ','coll.addI':'отдаёт одну вещь худшего качества',
  'coll.got':'В коллекции: {r}','coll.full':'Коллекция собрана: {m}. Легендарное +2%, скорость +10%, цена +10%'
});
I18n.add('en',{
  'q.0':'common','q.1':'good','q.2':'flawless','q.3':'legendary',
  'ms.toolsI':'Good +0.6% and flawless +0.4% chance per level',
  'cr2.mastery':'mastered {n}/{m}','cr2.faster':'handwork {p}% faster',
  'coll.title':'COLLECTION {n}/{m}','coll.info':'Give one item of each of the craftsman\'s recipes. A full collection: legendary +2%, speed +10%, price +10%.',
  'coll.doneI':'Collection complete: legendary +2%, speed +10%, price +10%.','coll.add':'TO COLLECTION','coll.addI':'gives one item of the lowest quality',
  'coll.got':'Added to collection: {r}','coll.full':'Collection complete: {m}. Legendary +2%, speed +10%, price +10%'
});

/* v14: питомцы */
I18n.add('ru',{
  'pet.fox':'Лиса','pet.shiba':'Шиба','pet.cat':'Кот','pet.wolf':'Волк','pet.dragon':'Дракончик',
  'pt.title':'МАСТЕР ПИТОМЦЕВ','pt.cardI':'даст лису','pt.trainS':'тренирует','pt.activeS':'с магом','pt.locked':'не найден',
  'pt.desc':'Мастер питомцев растит и тренирует зверей, которые ходят с магом в приключения. При найме он дарит ручную лису.',
  'pt.hire':'НАНЯТЬ','pt.hireI':'После найма лиса сразу пойдёт с магом. Других питомцев маг находит в главах.',
  'pt.where':'ГДЕ НАЙТИ','pt.whereStart':'Мастер питомцев дарит её при найме.','pt.whereTract':'Пройди главу «{t}» до 100-й волны. Шанс найти {p}% за каждое полное прохождение, пока не найдёшь.',
  'pt.bonus':'БОНУС','pt.perLvl':'за уровень','pt.level':'УРОВЕНЬ {n}/{m}','pt.next':'На следующем уровне: {e}',
  'pt.isActive':'Этот питомец ходит с магом.','pt.use':'ВЗЯТЬ С СОБОЙ','pt.train':'ТРЕНИРОВКА','pt.trainTo':'До уровня {n}',
  'pt.training':'Тренировка: {p}, ещё {t}','pt.block.hire':'Сначала найми мастера питомцев.','pt.block.busy':'Мастер уже тренирует другого питомца.','pt.block.max':'Максимальный уровень.','pt.block.none':'Питомец ещё не найден.',
  'pt.with':'С магом: {p}, ур. {n}','pt.got':'Мастер питомцев подарил: {p}','pt.foundT':'НОВЫЙ ПИТОМЕЦ','pt.found':'В конце главы к магу прибился новый питомец: {p}. Взять его с собой можно у мастера питомцев.',
  'pt.lvlUp':'{p} теперь уровня {n}'
});
I18n.add('en',{
  'pet.fox':'Fox','pet.shiba':'Shiba','pet.cat':'Cat','pet.wolf':'Wolf','pet.dragon':'Dragonling',
  'pt.title':'PET MASTER','pt.cardI':'gives a fox','pt.trainS':'training','pt.activeS':'with mage','pt.locked':'not found',
  'pt.desc':'The pet master raises and trains animals that go on adventures with the mage. When hired, he gives a tame fox.',
  'pt.hire':'HIRE','pt.hireI':'After hiring, the fox goes with the mage right away. Other pets are found in chapters.',
  'pt.where':'WHERE TO FIND','pt.whereStart':'The pet master gives it when hired.','pt.whereTract':'Clear the chapter "{t}" to wave 100. {p}% chance per full clear until found.',
  'pt.bonus':'BONUS','pt.perLvl':'per level','pt.level':'LEVEL {n}/{m}','pt.next':'Next level: {e}',
  'pt.isActive':'This pet goes with the mage.','pt.use':'TAKE ALONG','pt.train':'TRAINING','pt.trainTo':'To level {n}',
  'pt.training':'Training: {p}, {t} left','pt.block.hire':'Hire the pet master first.','pt.block.busy':'The master is training another pet.','pt.block.max':'Maximum level.','pt.block.none':'Pet not found yet.',
  'pt.with':'With the mage: {p}, lv {n}','pt.got':'The pet master gave you: {p}','pt.foundT':'NEW PET','pt.found':'At the end of the chapter a new pet joined the mage: {p}. Take it along at the pet master.',
  'pt.lvlUp':'{p} is now level {n}'
});

/* v15: промыслы, бригады, стадии улучшений */
I18n.add('ru',{
  'pd.saw':'ЛЕСОПИЛКА','pd.mine':'ШАХТА','pd.hunt':'ОХОТНИЧИЙ ДВОР','pd.farm':'ОГОРОД','pd.ghost':'ЛОВЕЦ ДУХОВ','pd.stable':'КОНЮШНЯ',
  'pd.saw.d':'Пилит дерево. Работает сама, запас забираешь на склад.',
  'pd.mine.d':'Уголь сразу, железо с летнего тракта, серебро и кристаллы с перевала.',
  'pd.hunt.d':'Охотники приносят кожу, а с осеннего тракта ещё кость и шёлк.',
  'pd.farm.d':'Травы с грядок, а когда откроется болото, споры из грибного погреба.',
  'pd.ghost.d':'Ловушки на болоте собирают эктоплазму.',
  'pd.stable.d':'Возчик с телегой сам объезжает промыслы и свозит запас на склад.',
  'pd.needTract':'Откроется после тракта «{t}»','pd.lineTract':'откроется: {t}','pd.perH':'{n} в час',
  'pd.full':'Запас полный, линия стоит','pd.storeFull':'На складе нет места','pd.nothing':'Забирать пока нечего',
  'pd.crews':'БРИГАДЫ СТРОИТЕЛЕЙ','pd.crewsNow':'Заняты {a} из {b}. Одна бригада строит одно здание за раз.',
  'pd.queue':'Ждут бригаду: {l}','pd.crewBuy':'ЕЩЁ БРИГАДА','pd.collectAll':'СОБРАТЬ ВСЁ','pd.started':'{b}: заказана постройка',
  'pd.cartNow':'Возчик ездит раз в {m} мин.','pd.cartNext':'Следующий объезд через {m}','pd.every':'раз в {m} мин.',
  'pd.got':'На склад: {l}','pd.cart':'Возчик привёз: {l}','pd.built':'{b}: уровень {n}','pd.builtNew':'{b} построена',
  'st2.toNext':'ДО УРОВНЯ {n}','st2.invest':'ВЛОЖИТЬ','st2.max5':'ВСЁ, ЧТО ХВАТИТ','st2.now':'Сейчас {a}, на следующем уровне {b}',
  'st2.left':'Все оставшиеся вклады: {g} золота. Каждый сразу даёт +1% шага, остальное приносит стройка.',
  'st2.building':'СТРОЙКА УРОВНЯ {n}','st2.making':'МАСТЕР ДЕЛАЕТ ИНСТРУМЕНТ {n}','st2.after':'После стройки: {v}',
  'st2.wait':'ЖДЁТ БРИГАДУ','st2.waitI':'Все бригады заняты. Стройка начнётся, когда одна освободится.','st2.max':'МАКСИМАЛЬНЫЙ УРОВЕНЬ',
  'st2.lastRes':'Последний вклад: золото и материалы для инструмента.',
  'ms.toolsI':'20 вкладов, потом мастер делает инструмент. Ниже шанс хорошего и безупречного.',
  'tl.done':'{m}: инструменты уровня {n}',
  'v15.title':'ПРОМЫСЛЫ','v15.body':'<p>Возле таверны теперь можно ставить промыслы: лесопилку, огород, охотничий двор, а позже ловца духов. Шахта тоже стала промыслом и копает уже не только уголь. Ресурс начинает добываться, когда открыт тракт, где он водится.</p><p>Улучшения идут по стадиям: 20 вкладов золотом, каждый сразу немного прибавляет, потом бригада строит следующий уровень. Инструменты мастеров улучшаются так же. Конюшня с возчиком сама свозит запас на склад.</p>',
  'lbl.build':'стройка','lbl.wait':'ждёт','off.prod':'Возчик привёз с промыслов'
});
I18n.add('en',{
  'pd.saw':'SAWMILL','pd.mine':'MINE','pd.hunt':'HUNTING LODGE','pd.farm':'GARDEN','pd.ghost':'SPIRIT TRAP','pd.stable':'STABLE',
  'pd.saw.d':'Saws wood on its own. Collect the stock to the store.',
  'pd.mine.d':'Coal right away, iron from the summer tract, silver and crystals from the pass.',
  'pd.hunt.d':'Hunters bring hide, and bone and silk after the autumn tract opens.',
  'pd.farm.d':'Herbs from the beds, and spores from the mushroom cellar once the swamp opens.',
  'pd.ghost.d':'Traps in the swamp collect ectoplasm.',
  'pd.stable.d':'A carter with a wagon tours the workshops and takes the stock to the store.',
  'pd.needTract':'Opens after the tract "{t}"','pd.lineTract':'opens: {t}','pd.perH':'{n} per hour',
  'pd.full':'Stock is full, the line has stopped','pd.storeFull':'No room in the store','pd.nothing':'Nothing to collect yet',
  'pd.crews':'BUILDING CREWS','pd.crewsNow':'Busy {a} of {b}. One crew builds one building at a time.',
  'pd.queue':'Waiting for a crew: {l}','pd.crewBuy':'ONE MORE CREW','pd.collectAll':'COLLECT ALL','pd.started':'{b}: construction ordered',
  'pd.cartNow':'The carter makes a round every {m} min.','pd.cartNext':'Next round in {m}','pd.every':'every {m} min.',
  'pd.got':'To the store: {l}','pd.cart':'The carter brought: {l}','pd.built':'{b}: level {n}','pd.builtNew':'{b} is built',
  'st2.toNext':'TO LEVEL {n}','st2.invest':'INVEST','st2.max5':'AS MUCH AS I CAN','st2.now':'Now {a}, next level {b}',
  'st2.left':'All remaining contributions: {g} gold. Each one adds +1% of the step right away, construction brings the rest.',
  'st2.building':'BUILDING LEVEL {n}','st2.making':'MASTER IS MAKING TOOLS {n}','st2.after':'After construction: {v}',
  'st2.wait':'WAITING FOR A CREW','st2.waitI':'All crews are busy. Construction starts when one is free.','st2.max':'MAXIMUM LEVEL',
  'st2.lastRes':'Last contribution: gold and materials for the tools.',
  'ms.toolsI':'20 contributions, then the master makes the tools. Below: good and flawless chance.',
  'tl.done':'{m}: tools level {n}',
  'v15.title':'WORKSHOPS','v15.body':'<p>You can now set up workshops near the tavern: a sawmill, a garden, a hunting lodge and later a spirit trap. The mine is a workshop too and digs more than coal now. A resource starts flowing once its tract is open.</p><p>Upgrades go in stages: 20 gold contributions, each adds a little right away, then a crew builds the next level. Master tools upgrade the same way. A stable with a carter takes the stock to the store by itself.</p>',
  'lbl.build':'building','lbl.wait':'waiting','off.prod':'The carter brought from the workshops'
});

/* v16: посёлок, зал, повар и пивовар */
I18n.add('ru',{
  'wk.hall':'ЗАЛ','wk.seats':'мест {a} из {b}','wk.guestsNow':'Гостей за столами: {n}','wk.incH':'тебе примерно {g} в час',
  'wk.hallI':'Путник после покупки садится за стол с шансом 60% и сидит 15 минут. Сейчас за столы садится около {h} гостей в час.',
  'wk.buySeat':'ЕЩЁ МЕСТО','wk.seatsHall':'Больше мест после улучшения зала','wk.seatsMax':'Все места куплены','wk.incTotal':'Зал уже принёс: {g} золота',
  'wk.brewer':'ПИВОВАР','wk.cook':'ПОВАР',
  'wk.brewer.d':'Варит пиво партиями. Каждый гость за столом берёт кружку.',
  'wk.cook.d':'Готовит блюда партиями. Каждый второй гость за столом заказывает еду.',
  'wk.needHall':'Нужна кухня: зал {n}-го уровня','wk.brewer.unit':'пиво','wk.cook.unit':'блюда','wk.batch':'{n} за {t}',
  'wk.price':'Порция стоит {p}, тебе {m}, остальное работнику в сбережения.',
  'wk.flow':'Гостям нужно около {a} в час, готовится до {b} в час.','wk.short':'Не хватает: найми помощника, иначе часть гостей уходит ни с чем.',
  'wk.helpers':'Помощники: {a} из {b}','wk.hireHelp':'НАНЯТЬ ПОМОЩНИКА','wk.helpLater':'Места для помощников прибавятся, когда работник расширится',
  'wk.savings':'СБЕРЕЖЕНИЯ ДО УРОВНЯ {n}','wk.savingsI':'Работник копит свою половину выручки. Каждые 5% сразу немного поднимают цену, а накопив всё, он сам расширяется.',
  'wk.expanding':'РАСШИРЯЕТСЯ ДО УРОВНЯ {n}',
  'wk.hired':'{w} нанят','wk.lvlUp':'{w} расширился: уровень {n}','wk.helpHired':'{w}: новый помощник','wk.seatGot':'Мест в зале: {n}',
  'lbl.tools':'инструмент','lbl.kitchen':'кухня','off.tav':'Гости за столами принесли {g} золота',
  'v16.title':'ПОСЁЛОК','v16.body':'<p>Таверна стала больше: зал на 10 метров, с уровнями зала появляются кухня и веранда. Гости садятся за столы, места докупаются во вкладке ТАВЕРНА.</p><p>Пивовар и повар готовят партиями и забирают себе половину выручки. Накопив, они сами расширяются, а ты нанимаешь им помощников. У каждого мастера теперь свой дом рядом с его промыслом, над домом уровень инструментов.</p>'
});
I18n.add('en',{
  'wk.hall':'HALL','wk.seats':'{a} of {b} seats','wk.guestsNow':'Guests at the tables: {n}','wk.incH':'about {g} per hour for you',
  'wk.hallI':'After buying, a traveler sits down with a 60% chance and stays 15 minutes. About {h} guests per hour take a seat now.',
  'wk.buySeat':'ONE MORE SEAT','wk.seatsHall':'More seats after the hall upgrade','wk.seatsMax':'All seats bought','wk.incTotal':'The hall has brought: {g} gold',
  'wk.brewer':'BREWER','wk.cook':'COOK',
  'wk.brewer.d':'Brews beer in batches. Every seated guest takes a mug.',
  'wk.cook.d':'Cooks dishes in batches. Every second seated guest orders food.',
  'wk.needHall':'Needs a kitchen: hall level {n}','wk.brewer.unit':'beer','wk.cook.unit':'dishes','wk.batch':'{n} per {t}',
  'wk.price':'A portion costs {p}, {m} for you, the rest goes to the worker\'s savings.',
  'wk.flow':'Guests need about {a} per hour, up to {b} per hour is made.','wk.short':'Not enough: hire a helper, or some guests leave with nothing.',
  'wk.helpers':'Helpers: {a} of {b}','wk.hireHelp':'HIRE A HELPER','wk.helpLater':'More helper places appear when the worker expands',
  'wk.savings':'SAVINGS TO LEVEL {n}','wk.savingsI':'The worker keeps his half of the takings. Every 5% raises the price a little, and when he has enough he expands by himself.',
  'wk.expanding':'EXPANDING TO LEVEL {n}',
  'wk.hired':'{w} hired','wk.lvlUp':'{w} expanded: level {n}','wk.helpHired':'{w}: new helper','wk.seatGot':'Seats in the hall: {n}',
  'lbl.tools':'tools','lbl.kitchen':'kitchen','off.tav':'Seated guests brought {g} gold',
  'v16.title':'THE VILLAGE','v16.body':'<p>The tavern is bigger now: a 10 meter hall, and hall levels add a kitchen and a veranda. Guests sit at tables, buy more seats on the TAVERN tab.</p><p>The brewer and the cook work in batches and keep half of the takings. When they save enough they expand by themselves, and you hire them helpers. Every master now has a house next to his workshop, with the tools level above it.</p>'
});

/* v17: новые монстры, элита, боссы по ролям */
I18n.add('ru',{
  'en.elite':'ЭЛИТА',
  'mv.snake':'ДРЕВЕСНЫЙ ЗМЕЙ','mv.goleling':'ЛЕСНОЙ ГОЛЕМ','mv.goleling_ev':'ДРЕВНИЙ ГОЛЕМ','mv.orc':'ОРК-РУДОКОП','mv.ninja':'ТЕНЕВОЙ НИНДЗЯ',
  'mv.frog':'ТРАВЯНАЯ ЖАБА','mv.greenblob':'ЗЕЛЁНЫЙ СЛИЗЕНЬ','mv.mushnub':'ГРИБНИК','mv.mushnub_ev':'ГРИБНОЙ СТАРЕЙШИНА','mv.bunny':'КРОЛИК-ГРОМИЛА',
  'mv.rat':'ЛЕСНАЯ КРЫСА','mv.birb':'ПТИЦА-ЗАДИРА','mv.dino':'КОСТОГРЫЗ','mv.tribal':'ШАМАН ПЛЕМЕНИ','mv.spider':'ПАУК-ТКАЧ','mv.armabee':'ЖУК-ТКАЧ',
  'mv.armabee_ev':'КОРОЛЕВСКИЙ ЖУК','mv.alpaking':'АЛЬПАКА-ВОИН','mv.alpaking_ev':'АЛЬПАКА-ВОЖДЬ','mv.wasp':'СПОРОВАЯ ОСА','mv.spikyblob':'КОЛЮЧИЙ СЛИЗЕНЬ',
  'mv.ghost':'БОЛОТНЫЙ ПРИЗРАК','mv.ghost_skull':'ЧЕРЕПНОЙ ПРИЗРАК','mv.glub':'ТОПЯНИК','mv.glub_ev':'ТОПЯНОЙ ЦАРЬ','mv.squidle':'КАЛЬМАРИК',
  'mv.mushking':'ГРИБНОЙ КОРОЛЬ','mv.bluedemon':'ЛЕДЯНОЙ БЕС','mv.hywirl':'ГОРНЫЙ ВИХРЬ','mv.yeti':'СЕРЕБРИСТЫЙ ЙЕТИ','mv.alien':'ЗВЁЗДНЫЙ ГОСТЬ',
  'mv.cactoro':'КАМЕННЫЙ КАКТУС','mv.wizard':'ГОРНЫЙ КОЛДУН',
  'bs.summer.mini':'ДРЕВНИЙ ГОЛЕМ','bs.summer.mid':'ГРИБНОЙ СТАРЕЙШИНА','bs.autumn.mini':'АЛЬПАКА-ВОЖДЬ','bs.autumn.mid':'ВЕРХОВНЫЙ ШАМАН',
  'bs.swamp.mini':'ТОПЯНОЙ ЦАРЬ','bs.swamp.mid':'ГРИБНОЙ КОРОЛЬ','bs.pass.mini':'ГОРНЫЙ ВИХРЬ','bs.pass.mid':'ГОРНЫЙ КОЛДУН',
  'v17.title':'НОВЫЕ МОНСТРЫ','v17.body':'<p>В каждом тракте теперь больше монстров, с 30-й волны попадается элита: крупнее, со свечением, крепче вдвое и с двойной добычей. Боссы на волнах 10-40 и 60-90 разные, на 50-й особый.</p><p>Бой живее: монстры замахиваются перед ударом, босс подсвечивает место удара, на крите стоп-кадр и отброс. Питомец сам подбегает и кусает, его урон теперь виден отдельными цифрами (в сумме он тот же).</p>'
});
I18n.add('en',{
  'en.elite':'ELITE',
  'mv.snake':'TREE SNAKE','mv.goleling':'FOREST GOLEM','mv.goleling_ev':'ANCIENT GOLEM','mv.orc':'ORC MINER','mv.ninja':'SHADOW NINJA',
  'mv.frog':'HERB TOAD','mv.greenblob':'GREEN SLIME','mv.mushnub':'MUSHLING','mv.mushnub_ev':'MUSHROOM ELDER','mv.bunny':'BRUTE BUNNY',
  'mv.rat':'FOREST RAT','mv.birb':'BULLY BIRD','mv.dino':'BONE GNAWER','mv.tribal':'TRIBE SHAMAN','mv.spider':'WEAVER SPIDER','mv.armabee':'WEAVER BEETLE',
  'mv.armabee_ev':'ROYAL BEETLE','mv.alpaking':'ALPACA WARRIOR','mv.alpaking_ev':'ALPACA CHIEF','mv.wasp':'SPORE WASP','mv.spikyblob':'SPIKY SLIME',
  'mv.ghost':'MARSH GHOST','mv.ghost_skull':'SKULL GHOST','mv.glub':'BOGLING','mv.glub_ev':'BOG KING','mv.squidle':'SQUIDLING',
  'mv.mushking':'MUSHROOM KING','mv.bluedemon':'ICE IMP','mv.hywirl':'MOUNTAIN WHIRL','mv.yeti':'SILVER YETI','mv.alien':'STAR VISITOR',
  'mv.cactoro':'STONE CACTUS','mv.wizard':'MOUNTAIN WARLOCK',
  'bs.summer.mini':'ANCIENT GOLEM','bs.summer.mid':'MUSHROOM ELDER','bs.autumn.mini':'ALPACA CHIEF','bs.autumn.mid':'HIGH SHAMAN',
  'bs.swamp.mini':'BOG KING','bs.swamp.mid':'MUSHROOM KING','bs.pass.mini':'MOUNTAIN WHIRL','bs.pass.mid':'MOUNTAIN WARLOCK',
  'v17.title':'NEW MONSTERS','v17.body':'<p>Every tract has more monsters now, and from wave 30 elites appear: bigger, glowing, twice as tough, with double loot. Bosses on waves 10-40 and 60-90 differ, wave 50 has a special one.</p><p>Combat is livelier: monsters wind up before striking, the boss marks where it will hit, crits freeze the frame and knock back. The pet runs in and bites on its own, its damage shows as separate numbers (the total is the same).</p>'
});

/* v18: картинки из 3D, книга коллекций, крафт по-новому */
I18n.add('ru',{
  'bk.title':'КНИГА КОЛЛЕКЦИЙ','bk.open':'КНИГА КОЛЛЕКЦИЙ','bk.total':'собрано {n} из {m}','bk.hint':'по одной вещи каждого рецепта',
  'bk.reward':'Соберёшь страницу целиком: легендарное +2%, скорость мастера +10%, цена его вещей +10%.',
  'bk.rewardOn':'Страница собрана: легендарное +2%, скорость +10%, цена +10%.',
  'bk.inBook':'Уже в книге.','bk.canAdd':'На складе: {n}. Вложи одну, в книгу уйдёт самая простая по качеству.','bk.add':'ВЛОЖИТЬ В КНИГУ',
  'bk.makeIt':'{m} умеет это делать: закажи в окне мастера.','bk.learnIt':'{m} выучит это у учителя на {n}-м уровне.','bk.mageLvl':'Маг напишет этот свиток на {n}-м уровне.',
  'cr3.toMasters':'МАСТЕРА','cr3.empty':'Здесь появятся вещи, которые ты заказывал (10 последних без повторов), и закреплённые. Заказывай новое в окне мастера: вкладка МАСТЕРА.',
  'cr3.pin':'ЗАКРЕПИТЬ','cr3.unpin':'ОТКРЕПИТЬ','cr3.openMaster':'ОКНО: {m}','cr3.pinned':'ЗАКРЕПЛЁННЫЕ','cr3.recent':'НЕДАВНИЕ',
  'cr3.hint':'Второе нажатие на выбранную вещь ставит её в очередь. Улучшения посоха, сумки и склада теперь во вкладке ГОРОД.',
  'ms3.mageD':'Маг сам пишет свитки, пока сидит в таверне. Новые свитки открываются его уровнем.','ms3.mageLater':'ОТКРОЮТСЯ ПОЗЖЕ','ms3.mageAwayS':'в походе',
  'store.noItems':'Пока ничего. Вещи заказывают в окне мастера (вкладка КРАФТ, МАСТЕРА).','v18.title':'КНИГА И КАРТИНКИ','v18.body':'<p>У всех вещей и ресурсов теперь картинки из 3D. Коллекции собраны в отдельную книгу: кнопка во вкладке КРАФТ и в окне мастера.</p><p>Вещи заказываются в окне мастера (маг тоже там, со своими свитками). Во вкладке КРАФТ остались 10 последних заказов и закреплённые вещи. Посох, сумка и склад улучшаются во вкладке ГОРОД. Гости в таверне едят и пьют за столами.</p>'
});
I18n.add('en',{
  'bk.title':'COLLECTION BOOK','bk.open':'COLLECTION BOOK','bk.total':'{n} of {m} collected','bk.hint':'one item of every recipe',
  'bk.reward':'Complete the page: legendary +2%, master speed +10%, item price +10%.',
  'bk.rewardOn':'Page complete: legendary +2%, speed +10%, price +10%.',
  'bk.inBook':'Already in the book.','bk.canAdd':'In store: {n}. Put one in; the lowest quality goes to the book.','bk.add':'PUT IN THE BOOK',
  'bk.makeIt':'{m} can make it: order in the master window.','bk.learnIt':'{m} learns it from the teacher at level {n}.','bk.mageLvl':'The mage writes this scroll at level {n}.',
  'cr3.toMasters':'MASTERS','cr3.empty':'Items you ordered (last 10, no repeats) and pinned ones show up here. Order new things in a master window: the MASTERS tab.',
  'cr3.pin':'PIN','cr3.unpin':'UNPIN','cr3.openMaster':'WINDOW: {m}','cr3.pinned':'PINNED','cr3.recent':'RECENT',
  'cr3.hint':'A second tap on the selected item queues it. Staff, bag and store upgrades are on the TOWN tab now.',
  'ms3.mageD':'The mage writes scrolls himself while sitting in the tavern. New scrolls open with his level.','ms3.mageLater':'OPEN LATER','ms3.mageAwayS':'on a trip',
  'store.noItems':'Nothing yet. Order items in a master window (CRAFT tab, MASTERS).','v18.title':'BOOK AND PICTURES','v18.body':'<p>All items and resources have pictures rendered from 3D now. Collections moved into a separate book: a button on the CRAFT tab and in the master window.</p><p>Items are ordered in the master window (the mage is there too, with his scrolls). The CRAFT tab keeps your last 10 orders and pinned items. Staff, bag and store are upgraded on the TOWN tab. Seated guests eat and drink at the tables.</p>'
});
/* v19: музыка, касания */
I18n.add('ru',{
  'v19.title':'СВОЯ МУЗЫКА','v19.body':'<p>У Aceonium теперь своя музыка вместо общей аркадной: тема при создании персонажа и в гардеробе, дневной посёлок, ночная таверна, свой трек у каждого тракта и отдельный, когда маг идёт по плану через несколько трактов.</p><p>На телефоне посёлок крутится одним пальцем, двумя пальцами приближается, двигается и поворачивается. Страница браузера больше не масштабируется.</p>'
});
I18n.add('en',{
  'v19.title':'OUR OWN MUSIC','v19.body':'<p>Aceonium has its own music now instead of the arcade playlist: a theme for character creation and the wardrobe, the town by day, the tavern at night, a track for every tract and one more for plan runs across several tracts.</p><p>On phones the town turns with one finger; two fingers zoom, move and rotate. The browser page no longer zooms.</p>'
});
/* v20: книга по качеству, замок, доля мастеров, справка */
I18n.add('ru',{
  'bq.in':'в книге','bq.add':'+ вложить ({n})','bq.needT':'есть копия, нужная книге',
  'lk.title':'Хозяйка не продаёт эту вещь, маг не берёт её в поход','lk.off':'НЕ ПРОДАВАТЬ','lk.on':'НЕ ПРОДАЁТСЯ',
  'bk.total':'ячеек {n} из {m}','bk.pages':'страниц {n}/{m}','bk.slots':'ячеек {n}/{m}',
  'bk.rwPages':'Все страницы: легендарное +2%, скорость +10%, цена +10%.','bk.rwGold':'Все ячейки (золотая страница): ещё +1% легендарного.',
  'bk.b1':'хорошее в книге: +3% безупречного','bk.b2':'безупречное в книге: +1% легендарного','bk.b3':'легендарное в книге: цена и скорость +10%',
  'bk.kept':'{q}: одна копия держится для книги','bk.freed':'{q}: пометка снята, можно продать','bk.freeB':'ОТПУСТИТЬ','bk.keepB':'ДЕРЖАТЬ',
  'bag.info':'Шанс добычи: x{p}','wk.hallI':'За столы садится около {h} гостей в час.',
  'bk.goldDone':'Золотая страница: {m}. Легендарное +1% на все его вещи',
  'coll.gotQ':'В книге: {r}, {q}','coll.full':'Все страницы собраны: {m}. Легендарное +2%, скорость +10%, цена +10%',
  'lg.got':'Легендарное! {m}: {r}','lg.kept':'Держится для книги.','off.legend':'Легендарных вещей: {n}',
  'ms4.part':'часть мастера','ms4.wait':'МАСТЕР КОПИТ СВОЮ ЧАСТЬ','ms4.started':'{m} начал новый инструмент',
  'st2.wait':'ЖДЁТ БРИГАДУ',
  'hp.menu':'СПРАВКА ПО ИГРЕ','hp.title':'СПРАВКА',
  'hp.trip.t':'Поход','hp.bag.t':'Сумка и склад','hp.tavern.t':'Таверна','hp.hall.t':'Зал и работники','hp.craft.t':'Крафт','hp.tools.t':'Инструменты и доля мастера',
  'hp.book.t':'Книга коллекций','hp.city.t':'Город','hp.mage.t':'Маг','hp.pets.t':'Питомцы','hp.save.t':'Сохранение',
  'hp.trip':'<p>Маг идёт по тракту волнами, на каждой 10-й волне босс, на 100-й главный босс. Первое прохождение тракта открывает следующий.</p>'+
    '<p>Маг устаёт: чем выше усталость, тем слабее удар. Уставший маг возвращается и спит, после сна какое-то время бьёт сильнее.</p>'+
    '<p>План походов: отметь, сколько раз пройти каждый тракт. Маг идёт по плану сверху вниз, между походами спит, когда устал. Пройдя план, повторяет последний тракт. "Идти сюда" отправляет сразу, план не трогает.</p>'+
    '<p>Проигрыш боссу стоит сумки. Зелье оберега спасает её один раз.</p>',
  'hp.bag':'<p>Монстры роняют ресурсы с шансом, он растёт с волной и после первого прохождения тракта. Сумка ограничена, лишнее пропадает.</p>'+
    '<p>В таверне маг выгружает сумку на склад. У склада свой предел на каждый ресурс. Сумку и склад улучшают во вкладке ГОРОД.</p>',
  'hp.tavern':'<p>Путник приходит с дороги, встаёт в очередь к стойке и просит одну вещь из тех, что лежат на полках. Хозяйка продаёт сама, по обычной цене, но только тому, кто дошёл до стойки. Нет вещи на полке: путник уходит.</p>'+
    '<p>Хозяйка отдаёт копию худшего качества и не трогает вещи с замком и копии, которые держатся для книги.</p>'+
    '<p>Пока маг спит, таверна закрыта. Пока тебя нет, всё работает так же.</p>',
  'hp.hall':'<p>Путник после покупки садится за стол с шансом 60% и сидит 15 минут. Места дают столы: их покупают и улучшают в режиме дизайна, ставит бригада строителей. Предел мест зависит от уровня зала.</p>'+
    '<p>Каждый гость берёт кружку у пивовара и с шансом 50% блюдо у повара. Работники готовят партиями, помощники увеличивают партию.</p>'+
    '<p>Половина выручки твоя, половина идёт работнику в сбережения. Сбережения понемногу поднимают цену, а накопив сумму, работник сам расширяется. Места для помощников прибавляются с его уровнем.</p>',
  'hp.craft':'<p>Вещи заказывают в окне мастера. Во вкладке КРАФТ остаются 10 последних заказанных и закреплённые, второе нажатие на выбранную вещь ставит её в очередь.</p>'+
    '<p>Очередь одна на всех. Каждый мастер берёт первую свою вещь, мастера работают одновременно. Нажми на вещь в очереди, чтобы отменить и вернуть ресурсы.</p>'+
    '<p>Освоение: каждая копия ускоряет работу руками, к 60-й вдвое. Варка, нагрев и сушка не ускоряются. Новые рецепты даёт учитель за золото, когда мастер дорос до уровня вещи.</p>',
  'hp.tools':'<p>Инструменты поднимают шанс хорошего и безупречного качества. Уровень берётся в 20 вкладов золотом, каждый следующий на 5% дороже и сразу даёт 1% шага. Последний вклад ещё и с материалами.</p>'+
    '<p>С каждой продажи своей вещи мастер откладывает 20% её цены. У тебя это не забирается: цена, которую ты видишь, и есть твой доход.</p>'+
    '<p>Новый инструмент мастер начинает делать, когда сделаны 20 вкладов и у него накоплена своя часть. Потом нужно время. Чем больше продаётся его вещей, тем быстрее он готов к следующему уровню.</p>',
  'hp.book':'<p>У каждой вещи 4 ячейки: обычное, хорошее, безупречное, легендарное. Вкладывается одна копия нужного качества.</p>'+
    '<p>Ячейки дают бонус своей вещи: хорошее +3% к шансу безупречного, безупречное +1% к шансу легендарного, легендарное +10% к цене и скорости изготовления.</p>'+
    '<p>Все страницы мастера (хоть одна ячейка у каждой вещи): легендарное +2%, скорость +10%, цена +10%. Все ячейки у всех его вещей: ещё +1% легендарного.</p>'+
    '<p>Копия хорошего, безупречного или легендарного качества, которого ещё нет в книге, держится для неё: хозяйка её не продаёт, маг не берёт в поход. Пометку можно снять в книге. Замок "НЕ ПРОДАВАТЬ" закрывает вещь целиком.</p>',
  'hp.city':'<p>Промыслы добывают ресурсы сами, но только с открытых трактов. Запас копится на 6 часов работы, его забирают тапом по зданию или кнопкой. Возчик свозит запас сам.</p>'+
    '<p>Здания улучшают 20 вкладами, потом бригада строит по времени. Бригада строит одно здание, остальные ждут очереди. Вторую и третью бригаду можно нанять.</p>'+
    '<p>Наверху вкладки заказы посоха, сумки и склада.</p>',
  'hp.mage':'<p>Навыки открываются уровнем мага и качаются очками, 1 очко за уровень. Клавиши 1-5, пробел: удар.</p>'+
    '<p>Отмеченные зелья маг берёт в поход по одному, лучшего свободного качества. Вещи с замком и копии для книги он не берёт.</p>'+
    '<p>Снаряжение надевается во вкладке МАГ. Вещи гардероба открываются уровнем мага и покупаются за золото таверны.</p>',
  'hp.pets':'<p>Мастер питомцев растит зверей, которые ходят с магом и кусают врагов. При найме он дарит лису, других можно найти в походах. Питомцев тренируют за золото.</p>',
  'hp.save':'<p>Прогресс хранится в этом браузере. Экспорт во вкладке ИНФО помогает перенести его на другое устройство или сохранить копию.</p>'
});
I18n.add('en',{
  'bq.in':'in book','bq.add':'+ add ({n})','bq.needT':'has a copy the book needs',
  'lk.title':'The hostess does not sell it, the mage does not take it on trips','lk.off':'DO NOT SELL','lk.on':'NOT FOR SALE',
  'bk.total':'{n} of {m} slots','bk.pages':'pages {n}/{m}','bk.slots':'slots {n}/{m}',
  'bk.rwPages':'All pages: legendary +2%, speed +10%, price +10%.','bk.rwGold':'All slots (golden page): +1% legendary more.',
  'bk.b1':'good in book: +3% flawless','bk.b2':'flawless in book: +1% legendary','bk.b3':'legendary in book: price and speed +10%',
  'bk.kept':'{q}: one copy is kept for the book','bk.freed':'{q}: released, can be sold','bk.freeB':'RELEASE','bk.keepB':'KEEP',
  'bag.info':'Drop chance: x{p}','wk.hallI':'About {h} guests an hour sit down.',
  'bk.goldDone':'Golden page: {m}. Legendary +1% on all their items',
  'coll.gotQ':'In the book: {r}, {q}','coll.full':'All pages collected: {m}. Legendary +2%, speed +10%, price +10%',
  'lg.got':'Legendary! {m}: {r}','lg.kept':'Kept for the book.','off.legend':'Legendary items: {n}',
  'ms4.part':'craftsman share','ms4.wait':'CRAFTSMAN IS SAVING UP','ms4.started':'{m} started new tools',
  'st2.wait':'WAITING FOR A CREW',
  'hp.menu':'GAME GUIDE','hp.title':'GUIDE',
  'hp.trip.t':'Trips','hp.bag.t':'Bag and store','hp.tavern.t':'Tavern','hp.hall.t':'Hall and workers','hp.craft.t':'Craft','hp.tools.t':'Tools and craftsman share',
  'hp.book.t':'Collection book','hp.city.t':'Town','hp.mage.t':'Mage','hp.pets.t':'Pets','hp.save.t':'Saving',
  'hp.trip':'<p>The mage walks a tract in waves, a boss every 10th wave and the main boss at 100. Clearing a tract once opens the next.</p>'+
    '<p>The mage gets tired and hits weaker. A tired mage goes home and sleeps, and hits harder for a while after rest.</p>'+
    '<p>Trip plan: set how many runs of each tract. The mage follows it top to bottom and sleeps between trips when tired. After the plan the last tract repeats. "Go here" sends him at once and keeps the plan.</p>'+
    '<p>Losing to a boss costs the bag. A ward potion saves it once.</p>',
  'hp.bag':'<p>Monsters drop resources by chance; it grows with the wave and after the first clear. The bag is limited, extra is lost.</p>'+
    '<p>In the tavern the mage unloads the bag into the store. The store has a limit per resource. Bag and store upgrades are on the TOWN tab.</p>',
  'hp.tavern':'<p>A traveler comes from the road, queues at the counter and asks for one item from the shelves. The hostess sells by herself at the normal price, but only to someone standing at the counter. No item on the shelf: the traveler leaves.</p>'+
    '<p>The hostess gives the lowest quality copy and skips locked items and copies kept for the book.</p>'+
    '<p>While the mage sleeps the tavern is closed. While you are away everything works the same.</p>',
  'hp.hall':'<p>After buying, a traveler sits down with a 60% chance for 15 minutes. Seats come from tables: buy and upgrade them in design mode, the building crew sets them up. The hall level sets the seat limit.</p>'+
    '<p>Every guest takes a mug from the brewer and, with a 50% chance, a dish from the cook. Workers cook in batches, helpers make batches bigger.</p>'+
    '<p>Half the revenue is yours, half goes to the worker\'s savings. Savings raise the price a little, and with enough saved the worker expands on his own. Helper slots grow with his level.</p>',
  'hp.craft':'<p>Items are ordered in the master window. The CRAFT tab keeps the last 10 ordered and pinned ones; a second tap on the selected item queues it.</p>'+
    '<p>One queue for everyone. Each master takes his first item, masters work at the same time. Tap an item in the queue to cancel and get the resources back.</p>'+
    '<p>Mastery: every copy speeds up the hand work, twice as fast by the 60th. Brewing, heating and drying do not speed up. New recipes come from a teacher for gold once the master reaches the item level.</p>',
  'hp.tools':'<p>Tools raise the chance of good and flawless quality. A level takes 20 gold contributions, each 5% dearer and giving 1% of the step at once. The last one needs materials too.</p>'+
    '<p>From every sale of his item the master puts aside 20% of its price. Nothing is taken from you: the price you see is your income.</p>'+
    '<p>The master starts new tools when the 20 contributions are done and his own share is saved. Then it takes time. The more of his items sell, the sooner he is ready.</p>',
  'hp.book':'<p>Every item has 4 slots: common, good, flawless, legendary. One copy of that quality goes in.</p>'+
    '<p>Slots boost their own item: good +3% flawless chance, flawless +1% legendary chance, legendary +10% price and craft speed.</p>'+
    '<p>All pages of a master (at least one slot per item): legendary +2%, speed +10%, price +10%. All slots of all his items: +1% legendary more.</p>'+
    '<p>A good, flawless or legendary copy whose slot is still empty is kept for the book: the hostess will not sell it and the mage will not take it. You can release it in the book. The DO NOT SELL lock closes the whole item.</p>',
  'hp.city':'<p>Production buildings gather resources by themselves, only from open tracts. Stock fills for 6 hours of work; collect it with a tap or the button. The carter collects on his own.</p>'+
    '<p>Buildings level up with 20 contributions, then a crew builds over time. A crew builds one building, others wait. You can hire a second and third crew.</p>'+
    '<p>Staff, bag and store orders are at the top of the tab.</p>',
  'hp.mage':'<p>Skills open with the mage level and grow with points, 1 point per level. Keys 1-5, space: hit.</p>'+
    '<p>Marked potions go on trips one each, the best free quality. Locked items and copies for the book stay home.</p>'+
    '<p>Gear is equipped on the MAGE tab. Wardrobe items open with the mage level and cost tavern gold.</p>',
  'hp.pets':'<p>The pet master raises animals that walk with the mage and bite enemies. On hire he gives a fox; others can be found on trips. Pets train for gold.</p>',
  'hp.save':'<p>Progress is kept in this browser. Export on the INFO tab helps move it to another device or keep a copy.</p>'
});
/* v20: новости */
I18n.add('ru',{
  'tv.noCust':'Пока никого.',
  'v20.title':'КНИГА ПО КАЧЕСТВУ','v20.body':'<p>У каждой вещи в книге теперь 4 ячейки: обычное, хорошее, безупречное и легендарное. Каждая ячейка даёт бонус своей вещи. Новая хорошая, безупречная или легендарная копия держится для книги: хозяйка её не продаст, маг не возьмёт в поход. На любую вещь можно повесить замок "НЕ ПРОДАВАТЬ".</p><p>Мастера откладывают 20% цены с продаж своих вещей (у тебя это не забирается) и вкладывают эту часть в новые инструменты вместе с тобой.</p><p>Пояснения к механикам переехали в справку: шестерёнка вверху и кнопки "?" у блоков.</p>'
});
I18n.add('en',{
  'tv.noCust':'Nobody yet.',
  'v20.title':'BOOK BY QUALITY','v20.body':'<p>Every item in the book has 4 slots now: common, good, flawless and legendary. Each slot boosts its own item. A new good, flawless or legendary copy is kept for the book: the hostess will not sell it and the mage will not take it. Any item can be locked with DO NOT SELL.</p><p>Masters put aside 20% of the price of their sold items (nothing is taken from you) and add that share to new tools together with you.</p><p>Mechanics explanations moved to the guide: the gear at the top and the "?" buttons.</p>'
});
/* v22: экраны */
I18n.add('ru',{'scn.road':'ПОХОД','scn.tavern':'ТАВЕРНА','scn.city':'ГОРОД','tl.tavern':'ТАВЕРНА',
  'v22.title':'ТАВЕРНА И ГОРОД','v22.body':'<p>Таверна и посёлок теперь отдельные экраны: кнопки ТАВЕРНА и ГОРОД слева сверху. В городе дом таверны под крышей, в таверне камера в зале. Пока маг в походе, можно зайти и в таверну, и в город, а кнопка ПОХОД вернёт к бою.</p>'});
I18n.add('en',{'scn.road':'TRIP','scn.tavern':'TAVERN','scn.city':'TOWN','tl.tavern':'TAVERN',
  'v22.title':'TAVERN AND TOWN','v22.body':'<p>The tavern and the town are separate screens now: TAVERN and TOWN buttons at the top left. In town the tavern has a roof; in the tavern the camera is inside the hall. While the mage is on a trip you can visit both, and TRIP takes you back to the fight.</p>'});
/* v23: окна и нижняя панель */
I18n.add('ru',{'grp.mage':'МАГ','grp.hall':'ЗАЛ','grp.build':'СТРОЙКА','grp.store':'ЗАПАСЫ','grp.craft':'СОЗДАТЬ','grp.info':'ИНФО','grp.book':'КНИГА','tv.repT':'Репутация',
  'tab.gear':'СНАРЯЖЕНИЕ','v23.title':'НОВЫЙ ИНТЕРФЕЙС','v23.body':'<p>Боковой панели больше нет: сцена на весь экран. Внизу кнопки МАГ, ЗАЛ, СТРОЙКА, СКЛАД, КНИГА и ИНФО открывают окна поверх сцены, справа очередь мастеров и кнопка СОЗДАТЬ. Слева столбиком экраны: ПОХОД, ТАВЕРНА, ГОРОД.</p>'});
I18n.add('en',{'grp.mage':'MAGE','grp.hall':'HALL','grp.build':'BUILD','grp.store':'SUPPLIES','grp.craft':'CRAFT','grp.info':'INFO','grp.book':'BOOK','tv.repT':'Reputation',
  'tab.gear':'GEAR','v23.title':'NEW INTERFACE','v23.body':'<p>The side panel is gone: the scene fills the screen. The MAGE, HALL, BUILD, STORE, BOOK and INFO buttons at the bottom open windows over the scene; on the right are the craft queue and the CRAFT button. Screens are stacked on the left: TRIP, TAVERN, TOWN.</p>'});
/* v24: лента СОЗДАТЬ, окно здания */
I18n.add('ru',{'cr4.fav':'ИЗБРАННОЕ','cr4.toMaster':'МАСТЕР','cr4.favEmpty':'Здесь будут закреплённые и последние заказанные вещи.','cr4.learning':'Мастер учит: {r}',
  'st3.to':'ДО УРОВНЯ {n}','st3.you':'ты {a} / {b}','st3.master':'мастер {a} / {b}','st3.invest':'ВЛОЖИТЬ','st3.max':'МАКС','st3.res':'+ материалы',
  'v24.title':'СОЗДАТЬ И ЗДАНИЯ','v24.body':'<p>Кнопка СОЗДАТЬ открывает ленту карточек внизу экрана: вкладки по мастерам и избранное. Тап по карточке ставит вещь в очередь, сверху видны ресурсы и очередь (тап по вещи в очереди отменяет заказ).</p><p>Улучшение зданий и инструментов теперь одной полосой: выбираешь, сколько вкладов сделать за раз, и жмёшь ВЛОЖИТЬ. У инструментов в той же полосе видна часть мастера.</p>'});
I18n.add('en',{'cr4.fav':'FAVORITES','cr4.toMaster':'MASTER','cr4.favEmpty':'Pinned and recently ordered items show up here.','cr4.learning':'Master is learning: {r}',
  'st3.to':'TO LEVEL {n}','st3.you':'you {a} / {b}','st3.master':'master {a} / {b}','st3.invest':'INVEST','st3.max':'MAX','st3.res':'+ materials',
  'v24.title':'CRAFT AND BUILDINGS','v24.body':'<p>The CRAFT button opens a strip of cards at the bottom: tabs per master and favorites. Tap a card to queue the item; resources and the queue are on top (tap an item in the queue to cancel it).</p><p>Buildings and tools now upgrade with one bar: choose how many contributions to make at once and press INVEST. For tools the master\'s share shows in the same bar.</p>'});
/* v25: режим дизайна и мебель */
I18n.add('ru',{'fu.title':'ДИЗАЙН','fu.btn':'ДИЗАЙН','fu.open':'РЕЖИМ ДИЗАЙНА','fu.wait':'Таверна ещё грузится',
  'fu.back':'НАЗАД','fu.close':'ЗАКРЫТЬ','fu.shop':'МАГАЗИН','fu.ok':'ГОТОВО','fu.rot':'ПОВЕРНУТЬ','fu.up':'УЛУЧШИТЬ','fu.store':'УБРАТЬ','fu.put':'ПОСТАВИТЬ',
  'fu.tab.table':'СТОЛЫ','fu.tab.decor':'ДЕКОР','fu.tab.store':'УБРАНО','fu.storeEmpty':'Убранной мебели нет.',
  'fu.stat':'места <b>{a}</b> / {b} · декор <b>{p}</b>: цены +{pr}%, путники +{fl}%',
  'fu.hallLine':'Декор {p}: цены +{pr}%, путников +{fl}%. Стойка: +{c} репутации с продажи.',
  'fu.hint':'Нажми на предмет и тащи. Зелёное можно, красное нельзя. Стойку можно улучшить.',
  'fu.next':'дальше','fu.seatsN':'мест: {n}','fu.ptsN':'декор +{n}','fu.floor':'на пол','fu.ceil':'под потолок','fu.own':'есть: {n}',
  'fu.counter':'СТОЙКА ХОЗЯЙКИ','fu.counterRep':'+{n} репутации с продажи','fu.counterUp':'Стойка улучшена до {n}',
  'fu.waitCrew':'Ждёт свободную бригаду строителей','fu.waitCrewS':'ждёт бригаду','fu.building':'Бригада ставит: {t}',
  'fu.bought':'Куплено: {n}','fu.bought.crew':'{n}: бригада начнёт, как освободится',
  'fu.fixFirst':'Сначала поставь всё на зелёные клетки',
  'fu.why.zone':'Здесь ставить нельзя','fu.why.overlap':'Мешает другой предмет','fu.why.block':'Перекрывает проход к стойке или двери','fu.why.seat':'К местам за столом не подойти','fu.why.other':'Другой предмет стоит неправильно','fu.why.any':'Что-то стоит неправильно',
  'fu.bl.hall':'Нужен выше уровень зала','fu.bl.hallN':'нужен зал {n}','fu.bl.seats':'Мест больше не вместить, улучши зал','fu.bl.max':'Максимум','fu.bl.busy':'Сейчас строится','fu.bl.cost':'Не хватает','fu.bl.space':'Нет места, подвинь мебель','fu.bl.last':'Последний стол убрать нельзя',
  'fu.table':'СТОЛ','fu.rug':'КОВЁР','fu.barrel':'БОЧКА','fu.crate':'ЯЩИК','fu.vase':'ВАЗА','fu.chest':'СУНДУК','fu.dummy':'МАНЕКЕН','fu.weapons':'СТОЙКА С ОРУЖИЕМ','fu.bookcase':'КНИЖНЫЙ ШКАФ','fu.armchair':'КРЕСЛО','fu.chandelier':'ЛЮСТРА',
  'hp.design.t':'Дизайн','hp.design':'<p>Кнопка ДИЗАЙН на экране таверны: камера над залом, пол в клетку. Нажми на предмет и тащи, ПОВЕРНУТЬ крутит его. Зелёные клетки значат можно, красные нельзя. ГОТОВО сохраняет расстановку, НАЗАД отменяет сдвиги.</p>'+
    '<p>Места для гостей дают только столы. Стол покупается в МАГАЗИНЕ, ставит его бригада строителей (та же, что строит промыслы). Улучшенный стол больше и вмещает больше гостей. Предел мест растёт с уровнем зала, зал 1 убирает хлам в западной части.</p>'+
    '<p>Декор (ковры, бочки, вазы, шкафы, люстры) даёт очки: каждое очко +0,5% к цене (до 30%) и +0,4% к потоку путников (до 25%). На стенах появляются флаги и фонари.</p>'+
    '<p>Стойка хозяйки даёт репутацию с каждой продажи. Репутация теперь тратится: на мебель и улучшения вместе с золотом. Мебель нельзя ставить на проход к стойке, очередь и дверь, и к каждому месту за столом должен быть подход.</p>',
  'v25.title':'РЕЖИМ ДИЗАЙНА','v25.body':'<p>В таверне появилась кнопка ДИЗАЙН: мебель стоит на сетке, её можно двигать, поворачивать, улучшать и покупать новую за золото и репутацию.</p><p>Места дают столы, их ставит бригада строителей. Твои места уже превращены в столы, а уровень убранства в декор. Маг теперь отдыхает у камина.</p><p>Репутация больше не копится до 200: она тратится на мебель, а стойка хозяйки даёт её с каждой продажи.</p>'
});
I18n.add('en',{'fu.title':'DESIGN','fu.btn':'DESIGN','fu.open':'DESIGN MODE','fu.wait':'The tavern is still loading',
  'fu.back':'BACK','fu.close':'CLOSE','fu.shop':'SHOP','fu.ok':'DONE','fu.rot':'ROTATE','fu.up':'UPGRADE','fu.store':'REMOVE','fu.put':'PLACE',
  'fu.tab.table':'TABLES','fu.tab.decor':'DECOR','fu.tab.store':'REMOVED','fu.storeEmpty':'No removed furniture.',
  'fu.stat':'seats <b>{a}</b> / {b} · decor <b>{p}</b>: prices +{pr}%, travelers +{fl}%',
  'fu.hallLine':'Decor {p}: prices +{pr}%, travelers +{fl}%. Counter: +{c} reputation per sale.',
  'fu.hint':'Press an item and drag it. Green is fine, red is not. The counter can be upgraded.',
  'fu.next':'next','fu.seatsN':'seats: {n}','fu.ptsN':'decor +{n}','fu.floor':'floor','fu.ceil':'ceiling','fu.own':'owned: {n}',
  'fu.counter':'HOSTESS COUNTER','fu.counterRep':'+{n} reputation per sale','fu.counterUp':'Counter upgraded to {n}',
  'fu.waitCrew':'Waiting for a free building crew','fu.waitCrewS':'waiting for crew','fu.building':'The crew is setting it up: {t}',
  'fu.bought':'Bought: {n}','fu.bought.crew':'{n}: the crew will start when free',
  'fu.fixFirst':'Put everything on green cells first',
  'fu.why.zone':'Cannot be placed here','fu.why.overlap':'Another item is in the way','fu.why.block':'Blocks the way to the counter or door','fu.why.seat':'The table seats cannot be reached','fu.why.other':'Another item is misplaced','fu.why.any':'Something is misplaced',
  'fu.bl.hall':'Needs a higher hall level','fu.bl.hallN':'needs hall {n}','fu.bl.seats':'No room for more seats, upgrade the hall','fu.bl.max':'Maximum','fu.bl.busy':'Being built','fu.bl.cost':'Not enough','fu.bl.space':'No room, move some furniture','fu.bl.last':'The last table cannot be removed',
  'fu.table':'TABLE','fu.rug':'RUG','fu.barrel':'BARREL','fu.crate':'CRATE','fu.vase':'VASE','fu.chest':'CHEST','fu.dummy':'DUMMY','fu.weapons':'WEAPON RACK','fu.bookcase':'BOOKCASE','fu.armchair':'ARMCHAIR','fu.chandelier':'CHANDELIER',
  'hp.design.t':'Design','hp.design':'<p>The DESIGN button on the tavern screen: the camera goes above the hall and the floor turns into a grid. Press an item and drag it, ROTATE turns it. Green cells mean OK, red ones mean no. DONE saves the layout, BACK cancels the moves.</p>'+
    '<p>Only tables give guest seats. Buy a table in the SHOP; the building crew (the same one that builds workshops) sets it up. An upgraded table is bigger and seats more. The seat limit grows with the hall level; hall 1 clears the junk in the west part.</p>'+
    '<p>Decor (rugs, barrels, vases, bookcases, chandeliers) gives points: each point is +0.5% to prices (up to 30%) and +0.4% to the traveler flow (up to 25%). Banners and lanterns appear on the walls.</p>'+
    '<p>The hostess counter gives reputation for every sale. Reputation is now spent on furniture and upgrades together with gold. Furniture cannot block the way to the counter, the queue or the door, and every table seat must be reachable.</p>',
  'v25.title':'DESIGN MODE','v25.body':'<p>The tavern has a DESIGN button: furniture stands on a grid, you can move, rotate and upgrade it and buy new pieces for gold and reputation.</p><p>Seats come from tables, set up by the building crew. Your seats have been turned into tables and the decor level into decor items. The mage now rests by the fireplace.</p><p>Reputation no longer stops at 200: it is spent on furniture, and the hostess counter gives it for every sale.</p>'
});
/* v26: полки, витрины, грузчик */
I18n.add('ru',{'fu.potshelf':'ПОЛКА С ЗЕЛЬЯМИ','fu.jcase':'ВИТРИНА','fu.tab.shelf':'ВИТРИНЫ','fu.slotsN':'{c}: {n} мест','fu.shelfUsed':'{c} на полках: {a} / {b}',
  'sh.title':'ПОЛКИ','sh.cat.pot':'Зелья и свитки','sh.cat.weap':'Оружие','sh.cat.arm':'Доспехи и одежда','sh.cat.jew':'Украшения',
  'sh.noCase':'нет витрины','sh.inStore':'ещё {n} на складе','sh.fill':'ВЫЛОЖИТЬ СО СКЛАДА','sh.filled':'Выложено на полки: {n}','sh.nothing':'Нечего выкладывать или нет места',
  'sh.onShelf':'на полке {n}','sh.onShelfS':'полка {n}','sh.noShelfT':'Нет витрины для вида "{c}": вещь осталась на складе. Купи её в режиме дизайна',
  'ld.title':'ГРУЗЧИК','ld.d':'Сам носит вещи со склада на полки, пока тебя нет. Без него полки пополняешь ты кнопкой "выложить со склада".',
  'ld.rate':'Переносит {n} вещей в час','ld.moved':'всего перенёс {n}','ld.next':'до {n}/ч',
  'hp.shelf.t':'Полки и грузчик','hp.shelf':'<p>Путники просят только то, что лежит на полках, и хозяйка продаёт только с полок. Готовая вещь сразу ложится на полку своего вида, если там есть место, иначе остаётся на складе.</p>'+
    '<p>Витрины: полка с зельями (зелья и свитки), стойка с оружием, манекен (доспехи и одежда), витрина (украшения). Покупаются и улучшаются в режиме дизайна, улучшение даёт больше мест. Нанятый мастер приносит свою витрину, если такой ещё нет.</p>'+
    '<p>Со склада на полки: кнопка ВЫЛОЖИТЬ СО СКЛАДА в окне ЗАЛ или СКЛАД, либо грузчик. Грузчик переносит ограниченное число вещей в час и работает, пока тебя нет. Вещи с замком и копии для книги на полки не попадают.</p>',
  'v26.title':'ПОЛКИ И ГРУЗЧИК','v26.body':'<p>Товар теперь лежит на витринах. Путники просят и хозяйка продаёт только то, что выложено на полки. Готовая вещь кладётся на полку сама, если есть место.</p><p>Витрины для твоих мастеров уже стоят в зале, запас со склада выложен. Повар и пивовар сами носят еду и пиво хозяйке.</p><p>В окне ЗАЛ можно нанять грузчика: он пополняет полки со склада, пока тебя нет.</p>'
});
I18n.add('en',{'fu.potshelf':'POTION SHELF','fu.jcase':'DISPLAY CASE','fu.tab.shelf':'DISPLAYS','fu.slotsN':'{c}: {n} slots','fu.shelfUsed':'{c} on shelves: {a} / {b}',
  'sh.title':'SHELVES','sh.cat.pot':'Potions and scrolls','sh.cat.weap':'Weapons','sh.cat.arm':'Armor and clothes','sh.cat.jew':'Jewelry',
  'sh.noCase':'no display','sh.inStore':'{n} more in store','sh.fill':'PUT OUT FROM STORE','sh.filled':'Put on shelves: {n}','sh.nothing':'Nothing to put out or no room',
  'sh.onShelf':'on shelf {n}','sh.onShelfS':'shelf {n}','sh.noShelfT':'No display for "{c}": the item stays in store. Buy one in design mode',
  'ld.title':'LOADER','ld.d':'Carries items from the store to the shelves while you are away. Without him you restock with the "put out from store" button.',
  'ld.rate':'Moves {n} items per hour','ld.moved':'moved {n} in total','ld.next':'to {n}/h',
  'hp.shelf.t':'Shelves and loader','hp.shelf':'<p>Travelers only ask for what is on the shelves, and the hostess only sells from the shelves. A finished item goes straight onto a shelf of its kind if there is room, otherwise it stays in store.</p>'+
    '<p>Displays: potion shelf (potions and scrolls), weapon rack, dummy (armor and clothes), display case (jewelry). Buy and upgrade them in design mode; upgrades give more slots. A newly hired master brings his own display if you have none.</p>'+
    '<p>From store to shelves: the PUT OUT FROM STORE button in the HALL or STORE window, or the loader. The loader moves a limited number of items per hour and works while you are away. Locked items and book copies never go on shelves.</p>',
  'v26.title':'SHELVES AND LOADER','v26.body':'<p>Goods now sit on displays. Travelers ask for and the hostess sells only what is on the shelves. A finished item goes on a shelf by itself if there is room.</p><p>Displays for your masters are already in the hall and your stock is put out. The cook and the brewer carry food and beer to the hostess themselves.</p><p>You can hire a loader in the HALL window: he restocks the shelves from the store while you are away.</p>'
});
/* v27: склад, сундуки, хозяйка продаёт сама */
I18n.add('ru',{'scn.store':'СКЛАД','tv.walk':'идёт, {s} с','tv.buying':'у стойки','tv.inLine':'в очереди: {n}','tv.noShelf':'нет на полке',
  'stu.name':'СКЛАД','stu.cap':'ресурсов до {n} каждого','stu.items':'вещей в сундуках {a} / {b}','stu.building':'Бригада ставит стеллажи до ур. {n}',
  'stu.nextRoom':'Дальше: стеллажи в каменной комнате, до {n} каждого','stu.openCel':'Дальше: бригада расчистит подвал, до {n} каждого','stu.nextCel':'Дальше: стеллажи в подвале, до {n} каждого',
  'stu.queued':'ЖДЁТ БРИГАДУ','stu.ordered':'Бригада займётся складом, как освободится','stu.go':'НА СКЛАД',
  'stu.fullT':'В сундуках нет места: мастер держит готовую вещь у себя. Поставь или улучши сундук на складе','stu.holdT':'Готово, но некуда положить: нужен сундук на складе',
  'fu.schest':'СУНДУК','fu.tab.chest':'СУНДУКИ','fu.chestN':'вещей: {n}','fu.bl.chestMax':'не больше {n}',
  'fu.statStore':'сундуки <b>{a}</b> / {b} · вещей {u} / {c} · ресурсов до {r}','fu.hintStore':'Сундуки хранят готовые вещи, которые не поместились на полки. Стеллажи с ресурсами ставит бригада строителей.',
  'lbl.rack':'СТЕЛЛАЖИ','lbl.rackS':'до {n} каждого',
  'hp.storage.t':'Склад','hp.storage':'<p>Склад - отдельный экран (кнопка СКЛАД слева). Это каменная кладовая у таверны, позже к ней добавляется подвал.</p>'+
    '<p>Ресурсы лежат на стеллажах. Новые стеллажи ставит бригада строителей: улучшение склада в окне СТРОЙКА или ЗАПАСЫ. Первые уровни в каменной комнате, с 4-го бригада расчищает подвал.</p>'+
    '<p>Готовые вещи лежат на полках таверны и в сундуках склада, сундуков не больше пяти, у каждого три уровня. Если класть некуда, мастер держит готовую вещь у себя и не начинает следующую.</p>',
  'v27r.title':'СОХРАНЕНИЯ СБРОШЕНЫ','v27r.body':'<p>Для этой версии прогресс начинается заново. Персонаж, облик и настройки остались.</p>',
  'v27.title':'СКЛАД И ДВОР','v27.body':'<p>Хозяйка продаёт сама: путник приходит, встаёт к стойке и покупает то, что лежит на полках. Кнопок продажи больше нет.</p><p>Новый экран СКЛАД: каменная кладовая со стеллажами ресурсов, позже подвал. Готовые вещи хранятся на полках таверны и в сундуках склада (до пяти). Склад улучшает бригада строителей.</p><p>Вокруг таверны появился двор с колодцем, поленницей, грядками и изгородью, его видно и из города.</p>'
});
I18n.add('en',{'scn.store':'STORE','tv.walk':'walking, {s} s','tv.buying':'at the counter','tv.inLine':'in line: {n}','tv.noShelf':'not on shelf',
  'stu.name':'STOREHOUSE','stu.cap':'resources up to {n} each','stu.items':'items in chests {a} / {b}','stu.building':'The crew is building racks to lv. {n}',
  'stu.nextRoom':'Next: racks in the stone room, up to {n} each','stu.openCel':'Next: the crew clears the cellar, up to {n} each','stu.nextCel':'Next: racks in the cellar, up to {n} each',
  'stu.queued':'WAITING FOR CREW','stu.ordered':'The crew will work on the storehouse when free','stu.go':'TO THE STORE',
  'stu.fullT':'No room in the chests: the master keeps the finished item. Place or upgrade a chest in the store','stu.holdT':'Done, but nowhere to put it: a chest is needed',
  'fu.schest':'CHEST','fu.tab.chest':'CHESTS','fu.chestN':'items: {n}','fu.bl.chestMax':'max {n}',
  'fu.statStore':'chests <b>{a}</b> / {b} · items {u} / {c} · resources up to {r}','fu.hintStore':'Chests keep finished items that did not fit on the shelves. The building crew sets up resource racks.',
  'lbl.rack':'RACKS','lbl.rackS':'up to {n} each',
  'hp.storage.t':'Storehouse','hp.storage':'<p>The storehouse is a separate screen (STORE button on the left): a stone storeroom next to the tavern, later with a cellar.</p>'+
    '<p>Resources sit on racks. The building crew sets up new racks: upgrade the storehouse in the BUILD or SUPPLIES window. The first levels go into the stone room, from level 4 the crew clears the cellar.</p>'+
    '<p>Finished items sit on the tavern shelves and in storehouse chests, up to five chests with three levels each. When there is nowhere to put an item, the master keeps it and does not start the next one.</p>',
  'v27r.title':'SAVES RESET','v27r.body':'<p>Progress starts over in this version. Your character, look and settings are kept.</p>',
  'v27.title':'STOREHOUSE AND YARD','v27.body':'<p>The hostess sells by herself: a traveler comes, stands at the counter and buys what is on the shelves. No more sell buttons.</p><p>New STORE screen: a stone storeroom with resource racks, later a cellar. Finished items are kept on the tavern shelves and in storehouse chests (up to five). The building crew upgrades the storehouse.</p><p>The tavern now has a yard with a well, a woodpile, herb beds and a hedge, also visible from the town.</p>'
});
/* v28: внешность: перекраска, головные уборы */
I18n.add('ru',{'wd2.tColor':'ЦВЕТА','wd2.hat':'ГОЛОВНОЙ УБОР','wd2.hatC1':'ЦВЕТ УБОРА','wd2.hatC2':'ОТДЕЛКА','wd2.asIs':'как есть','wd2.tintReset':'ВСЁ КАК БЫЛО','wd2.tintRnd':'СЛУЧАЙНО',
  'hat.none':'нет','hat.wizard':'колпак мага','hat.straw':'соломенная шляпа','hat.beret':'берет','hat.bard':'берет с пером','hat.cap':'вязаная шапка','hat.headband':'повязка',
  'hat.wreath':'венок','hat.crown':'корона','hat.goggles':'гогглы','hat.catears':'кошачьи ушки','hat.glasses':'очки',
  'zone.top':'Куртка и капюшон','zone.legs':'Штаны','zone.leather':'Кожа','zone.metal':'Металл','zone.shirt':'Рубаха','zone.boots':'Обувь и ремни','zone.vest':'Жилет'});
I18n.add('en',{'wd2.tColor':'COLORS','wd2.hat':'HEADWEAR','wd2.hatC1':'HEADWEAR COLOR','wd2.hatC2':'TRIM','wd2.asIs':'as is','wd2.tintReset':'RESET ALL','wd2.tintRnd':'RANDOM',
  'hat.none':'none','hat.wizard':'wizard hat','hat.straw':'straw hat','hat.beret':'beret','hat.bard':'feathered beret','hat.cap':'knit cap','hat.headband':'headband',
  'hat.wreath':'wreath','hat.crown':'crown','hat.goggles':'goggles','hat.catears':'cat ears','hat.glasses':'glasses',
  'zone.top':'Jacket and hood','zone.legs':'Trousers','zone.leather':'Leather','zone.metal':'Metal','zone.shirt':'Shirt','zone.boots':'Boots and belts','zone.vest':'Vest'});
})();
