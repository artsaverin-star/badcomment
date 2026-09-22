import { defineStrings } from "@/site/i18n/strings";

// Web-only copy of the landing (spec 08 §4–§5; ARCHITECTURE §6). App UI strings that already
// exist in content/v2/<L>/ui.json («Бесплатный разбор», «Идея в Plus», onboarding titles, …)
// are NOT repeated here — the landing reads them with t(). Numbers are placeholders ({topics},
// {ideas}, {reviews}, …) filled from the content packs, so the copy never drifts from the data.
//
// Rules baked into this copy (DECISIONS «Legal pages», §12–13; spec 09 C20, O7):
//   • the landing is the App Store marketing URL: no website prices, no payment methods,
//     no buy buttons; Plus plans are described as the iPhone app's (no prices);
//   • 744 775 / 2 356 is the headline number; the 1,4M archive appears only in FAQ 2;
//   • offline / no account / on-device notes are iPhone-app facts, never web facts.
// Server components read strings[L]; client islands get the few labels they need as props.

export const landingStrings = defineStrings({
  ru: {
    metaTitle: "Идеи приложений и ниши из реальных отзывов — inApp",
    metaDescription:
      "35 редакторских разборов и 293 идеи приложений на основе открытых отзывов. Пойми, что нужно людям, до начала разработки. Один полный разбор — бесплатно.",
    ogAlt: "inApp — разборы отзывов и идеи приложений",

    heroEyebrow: "35 тем. Реальные отзывы. Новые возможности.",
    heroTitle: "Найди идею приложения в задачах, о которых люди уже пишут в отзывах.",
    heroLead:
      "{topics} редакторских разборов и {ideas} идеи приложений на основе открытых отзывов. Узнай, что люди пытаются сделать, где им мешают существующие продукты и какие вопросы стоит проверить до начала разработки.",
    ctaWeb: "Открыть веб-версию",
    heroMicro: "Один полный разбор — бесплатно.",
    appStoreSoon: "Скоро в App Store",
    heroFigure: "Пример из разбора",
    ratingLabel: "Оценка: {n} из 5",

    numbersTitle: "inApp в цифрах",
    statTopics: "разборов",
    statIdeas: "идеи приложений",
    statReviews: "отзывов о {apps} приложениях",
    statReviewsHint: "Столько отзывов изучено для {topics} опубликованных разборов.",
    statLanguages: "языков",
    numbersFootnote: "Срез отзывов — август–сентябрь 2026 года, а не живая лента рынка.",

    freeTitle: "Попробуй полный разбор бесплатно",
    freeInside: "В разборе",
    freeMeta: "{parts} части · {observations} наблюдений · {ideas} идей",
    freeCta: "Читать бесплатно",

    ideasTitle: "Начни с 5 бесплатных идей",
    allIdeas: "Все идеи",

    carouselLabel: "Примеры из разборов",
    carouselPrev: "Предыдущий пример",
    carouselNext: "Следующий пример",
    carouselPause: "Остановить прокрутку",
    carouselPlay: "Запустить прокрутку",
    carouselSlide: "Пример {i} из {n}",
    openBreakdown: "Открыть разбор",

    howTitle: "Как это работает",
    stepLabel: "Шаг {n}",
    step1Title: "Пойми потребность за отзывом",
    step1Body:
      "Каждый разбор связывает повторяющиеся ситуации с выбранными цитатами из отзывов и возможными улучшениями.",
    step2Title: "Изучи идею и её основания",
    step2Body: "Изучи конкретное решение: для кого оно, какую задачу решает и на чём основано.",
    step3Title: "Сохраняй находки и свои мысли",
    step3Body: "Ищи по коллекции, сохраняй полезное и добавляй свои заметки.",
    step4Title: "Экспортируй идею вместе с её основаниями",
    step4Body:
      "Полный разбор категории, идея и твоя заметка — в одном файле. Один текстовый файл (.txt): можно читать, редактировать или передать в ИИ вместе со своим вопросом.",
    noteSample: "Проверить на своей комнате: что должно остаться на месте, а что можно менять.",

    topicsKicker: "{n} разборов",
    topicsShowAll: "Показать все {n}",
    topicsCatalog: "Открыть каталог разборов",

    trustTitle: "Как мы работаем с отзывами",
    trust2: "Это наблюдения и гипотезы для проверки, а не обещания спроса или дохода.",
    trust3:
      "inApp не создаёт приложения, не отслеживает позиции в App Store и не обещает доход. Срез отзывов — август–сентябрь 2026 года.",

    webTitle: "Читай в браузере или на iPhone",
    webColTitle: "Веб-версия",
    webColBody:
      "Те же разборы и идеи в любом браузере. Закладки и заметки сохраняются в браузере, а после входа — в твоём аккаунте.",
    iphoneColTitle: "Читай на своём языке и офлайн",
    iphoneColBody:
      "Тексты и иллюстрации включены в приложение. Аккаунт не нужен. Закладки и заметки хранятся на твоём устройстве; в inApp нет рекламного отслеживания.",

    plusFreeTitle: "Бесплатно",
    plusFree1: "Разбор «{topic}» целиком",
    plusFree2: "{n} идей из этого разбора",
    plusFree3: "Каталог всех {topics} разборов и поиск",
    plusFree4: "Закладки и заметки",
    plusFree5: "Экспорт бесплатных идей",
    plusAll1: "Все {topics} разборов и {ideas} идеи",
    plusAll2: "Экспорт без ограничений",
    plusPlansTitle: "В приложении для iPhone",
    plusTerms: "Оба варианта оплачиваются сразу, без пробного периода. Актуальная цена показана перед покупкой.",
    plusGet: "Plus открывается в приложении для iPhone. Бесплатные материалы можно читать и в веб-версии.",

    faqTitle: "Частые вопросы",
    faqMore: "Ещё вопросы",
    faq1Q: "Что такое inApp?",
    faq1A:
      "Библиотека редакторских разборов и идей приложений на основе открытых отзывов: {topics} разборов и {ideas} идеи. Узнай, что люди пытаются сделать, где им мешают существующие продукты и какие вопросы стоит проверить до начала разработки.",
    faq2Q: "Откуда берутся разборы и идеи?",
    faq2A:
      "Материалы составлены по отзывам о приложениях. Цитаты внутри разборов помогают понять, на чём основаны выводы. {topics} разборов опираются на {reviews} отзывов о {apps} приложениях; весь архив исследования — {archiveReviews} отзыва о {archiveApps} приложениях. Срез собран в августе–сентябре 2026 года, это не живая лента рынка. Большинство цитат — из англоязычных отзывов; на других языках показан перевод.",
    faq3Q: "Это гарантия, что идея заработает?",
    faq3A:
      "Нет. Это наблюдения и гипотезы для проверки, а не обещания спроса или дохода. inApp не создаёт приложения, не отслеживает позиции в App Store и не обещает доход.",
    faq4Q: "Что доступно бесплатно?",
    faq4A:
      "Разбор «{topic}» и {n} идей доступны без подписки. inApp Plus открывает всю коллекцию и экспорт без ограничений.",
    faq5Q: "Как устроен Plus?",
    faq5A:
      "В приложении для iPhone Plus доступен по годовой подписке с автоматическим продлением или навсегда — за один платёж без продления. Оба варианта оплачиваются сразу, без пробного периода. Актуальная цена показана перед покупкой.",
    faq6Q: "Что внутри экспорта?",
    faq6A:
      "Один текстовый файл (.txt): полный разбор категории, идея целиком и твоя заметка. Его можно читать, редактировать или передать в ИИ вместе со своим вопросом.",
    faq7Q: "На каких языках?",
    faq7A: "Интерфейс и редакторские материалы доступны на русском, английском, немецком, французском и японском.",
    faq8Q: "Можно ли читать без интернета?",
    faq8A:
      "В приложении для iPhone — да: тексты и иллюстрации входят в приложение. Для покупки и восстановления доступа нужно подключение к App Store.",
    faq9Q: "Нужен ли аккаунт и где хранятся заметки?",
    faq9A:
      "В приложении для iPhone аккаунт не нужен: закладки и заметки хранятся на устройстве, синхронизации между устройствами нет. В веб-версии они сохраняются в браузере, а после входа — в твоём аккаунте. В приложении для iPhone нет рекламного отслеживания.",
    faq10Q: "Как отменить подписку?",
    faq10A:
      "При покупке в App Store: если не отменить подписку минимум за 24 часа до конца текущего периода, она продлится по указанной годовой цене. Управлять подпиской и отменить её можно в настройках аккаунта App Store.",

    finalTitle: "Найди идею для приложения",
  },

  en: {
    metaTitle: "App Ideas & Niche Research from Real Reviews — inApp",
    metaDescription:
      "35 editorial breakdowns and 293 app ideas drawn from public app reviews. Discover the needs behind real reviews before you build. One complete topic is free.",
    ogAlt: "inApp — review breakdowns and app ideas",

    heroEyebrow: "35 topics. Real reviews. New possibilities.",
    heroTitle: "Find your next app idea in the problems people already describe.",
    heroLead:
      "{topics} editorial breakdowns and {ideas} app ideas drawn from public app reviews. Read what people are trying to do, where existing products let them down, and which questions are worth testing before you build.",
    ctaWeb: "Open web version",
    heroMicro: "One complete topic is free.",
    appStoreSoon: "Coming soon to the App Store",
    heroFigure: "A sample from a breakdown",
    ratingLabel: "Rated {n} of 5 stars",

    numbersTitle: "inApp in numbers",
    statTopics: "breakdowns",
    statIdeas: "app ideas",
    statReviews: "reviews of {apps} apps",
    statReviewsHint: "Reviews studied for the {topics} published breakdowns.",
    statLanguages: "languages",
    numbersFootnote: "Review snapshot from August–September 2026, not a live market feed.",

    freeTitle: "Try a complete breakdown for free",
    freeInside: "Inside",
    freeMeta: "{parts} parts · {observations} observations · {ideas} ideas",
    freeCta: "Read for free",

    ideasTitle: "Start with 5 free ideas",
    allIdeas: "All ideas",

    carouselLabel: "Samples from the breakdowns",
    carouselPrev: "Previous example",
    carouselNext: "Next example",
    carouselPause: "Pause autoplay",
    carouselPlay: "Start autoplay",
    carouselSlide: "Example {i} of {n}",
    openBreakdown: "Open the breakdown",

    howTitle: "How it works",
    stepLabel: "Step {n}",
    step1Title: "Explore the need behind the review",
    step1Body: "Each breakdown connects recurring situations with selected review quotes and possible improvements.",
    step2Title: "See the reasons behind each idea",
    step2Body:
      "Explore concrete ideas, their intended audience, the problem they address and the reasons behind them.",
    step3Title: "Keep your findings in one place",
    step3Body: "Search the collection, save useful material and add your own notes.",
    step4Title: "Export an idea with its supporting context",
    step4Body:
      "The full category breakdown, the idea and your note — in one file. One text file (.txt): you can read it, edit it or hand it to an AI with your question.",
    noteSample: "Check against my own room: what has to stay in place and what can change.",

    topicsKicker: "{n} breakdowns",
    topicsShowAll: "Show all {n}",
    topicsCatalog: "Open the breakdown catalog",

    trustTitle: "How we treat the reviews",
    trust2: "These are research observations and ideas to investigate, not promises of demand or revenue.",
    trust3:
      "inApp does not generate apps, track App Store ranks or promise revenue. The review snapshot is from August–September 2026.",

    webTitle: "Read in your browser or on iPhone",
    webColTitle: "Web version",
    webColBody:
      "The same breakdowns and ideas in any browser. Bookmarks and notes are kept in your browser, and in your account once you sign in.",
    iphoneColTitle: "Read in your language, even offline",
    iphoneColBody:
      "Articles and illustrations are included in the app. No account is needed. Bookmarks and notes stay on your device; inApp has no advertising tracking.",

    plusFreeTitle: "Free",
    plusFree1: "The full “{topic}” breakdown",
    plusFree2: "{n} ideas from it",
    plusFree3: "Catalog of all {topics} breakdowns and search",
    plusFree4: "Bookmarks and notes",
    plusFree5: "Export of the free ideas",
    plusAll1: "All {topics} breakdowns and {ideas} ideas",
    plusAll2: "Unlimited export",
    plusPlansTitle: "In the iPhone app",
    plusTerms: "Both options start with a paid purchase, without a free trial. The local price is shown before purchase.",
    plusGet: "Plus is available in the iPhone app. The free material can also be read in the web version.",

    faqTitle: "Frequently asked questions",
    faqMore: "More questions",
    faq1Q: "What is inApp?",
    faq1A:
      "A library of editorial breakdowns and app ideas drawn from public app reviews: {topics} breakdowns and {ideas} ideas. Read what people are trying to do, where existing products let them down, and which questions are worth testing before you build.",
    faq2Q: "Where do the breakdowns and ideas come from?",
    faq2A:
      "The materials are built from app reviews. The quotes inside breakdowns show what the conclusions rest on. The {topics} breakdowns draw on {reviews} reviews of {apps} apps; the whole research archive holds {archiveReviews} reviews of {archiveApps} apps. The snapshot was collected in August–September 2026; it is not a live market feed. Most quotes come from English-language reviews; other languages show a translation.",
    faq3Q: "Does this prove an idea will make money?",
    faq3A:
      "No. These are research observations and ideas to investigate, not promises of demand or revenue. inApp does not generate apps, track App Store ranks or promise revenue.",
    faq4Q: "What is free?",
    faq4A:
      "The {topic} breakdown and {n} ideas are available without a subscription. inApp Plus unlocks the full collection and unlimited export.",
    faq5Q: "How does Plus work?",
    faq5A:
      "In the iPhone app, choose an auto-renewing annual subscription or lifetime access with a single purchase and no renewal. Both options start with a paid purchase, without a free trial. The local price is shown before purchase.",
    faq6Q: "What is in an export?",
    faq6A:
      "One text file (.txt): the full category breakdown, the whole idea and your note. You can read it, edit it or hand it to an AI with your question.",
    faq7Q: "Which languages?",
    faq7A: "The interface and editorial collection are available in English, Russian, German, French and Japanese.",
    faq8Q: "Can I read offline?",
    faq8A:
      "In the iPhone app, yes: texts and illustrations ship with the app. Buying and restoring access needs an App Store connection.",
    faq9Q: "Do I need an account, and where are my notes?",
    faq9A:
      "The iPhone app needs no account: bookmarks and notes are kept on the device, with no syncing between devices. In the web version they are kept in your browser, and in your account once you sign in. The iPhone app has no advertising tracking.",
    faq10Q: "How do I cancel?",
    faq10A:
      "For App Store purchases: unless cancelled at least 24 hours before the current period ends, the subscription renews at the displayed annual price. Manage or cancel it in your App Store account settings.",

    finalTitle: "Find your next app idea",
  },

  de: {
    metaTitle: "App-Ideen & Marktlücken aus echten Bewertungen – inApp",
    metaDescription:
      "35 redaktionelle Analysen und 293 App-Ideen aus öffentlichen Bewertungen. Verstehe, was Menschen brauchen, bevor du entwickelst. Ein ganzes Thema ist kostenlos.",
    ogAlt: "inApp – Analysen von Rezensionen und App-Ideen",

    heroEyebrow: "35 Themen. Echte Bewertungen. Neue Möglichkeiten.",
    heroTitle: "Finde deine nächste App-Idee in den Problemen, die Menschen bereits beschreiben.",
    heroLead:
      "{topics} redaktionelle Analysen und {ideas} App-Ideen auf Grundlage öffentlicher App-Bewertungen. Erfahre, was Menschen erreichen möchten, wo bestehende Produkte sie im Stich lassen und welche Fragen du vor der Entwicklung prüfen solltest.",
    ctaWeb: "Web-Version öffnen",
    heroMicro: "Ein ganzes Thema ist kostenlos.",
    appStoreSoon: "Bald im App Store",
    heroFigure: "Ein Beispiel aus einer Analyse",
    ratingLabel: "Bewertung: {n} von 5 Sternen",

    numbersTitle: "inApp in Zahlen",
    statTopics: "Analysen",
    statIdeas: "App-Ideen",
    statReviews: "Bewertungen zu {apps} Apps",
    statReviewsHint: "So viele Bewertungen stecken in den {topics} veröffentlichten Analysen.",
    statLanguages: "Sprachen",
    numbersFootnote: "Datenstand August–September 2026, kein Live-Marktfeed.",

    freeTitle: "Eine vollständige Analyse kostenlos",
    freeInside: "Darin",
    freeMeta: "{parts} Teile · {observations} Beobachtungen · {ideas} Ideen",
    freeCta: "Kostenlos lesen",

    ideasTitle: "Starte mit 5 kostenlosen Ideen",
    allIdeas: "Alle Ideen",

    carouselLabel: "Beispiele aus den Analysen",
    carouselPrev: "Vorheriges Beispiel",
    carouselNext: "Nächstes Beispiel",
    carouselPause: "Automatisches Blättern anhalten",
    carouselPlay: "Automatisches Blättern starten",
    carouselSlide: "Beispiel {i} von {n}",
    openBreakdown: "Analyse öffnen",

    howTitle: "So funktioniert es",
    stepLabel: "Schritt {n}",
    step1Title: "Verstehe das Bedürfnis hinter der Bewertung",
    step1Body:
      "Jede Analyse verbindet wiederkehrende Situationen mit ausgewählten Zitaten und möglichen Verbesserungen.",
    step2Title: "Lies, was hinter einer Idee steckt",
    step2Body: "Entdecke konkrete Ideen, ihre Zielgruppe, das Problem und die Belege dahinter.",
    step3Title: "Sammle Ideen und eigene Notizen",
    step3Body: "Durchsuche die Sammlung, speichere hilfreiche Inhalte und ergänze eigene Notizen.",
    step4Title: "Exportiere eine Idee mit ihrem Hintergrund",
    step4Body:
      "Die vollständige Kategorie-Analyse, die Idee und deine Notiz — in einer Datei. Eine Textdatei (.txt): Du kannst sie lesen, bearbeiten oder zusammen mit deiner Frage an eine KI geben.",
    noteSample: "Mit meinem eigenen Zimmer abgleichen: Was muss bleiben, was darf sich ändern?",

    topicsKicker: "{n} Analysen",
    topicsShowAll: "Alle {n} anzeigen",
    topicsCatalog: "Katalog der Analysen öffnen",

    trustTitle: "Wie wir mit Bewertungen arbeiten",
    trust2: "Es sind Beobachtungen und Ideen zum Überprüfen, keine Versprechen über Nachfrage oder Einnahmen.",
    trust3:
      "inApp erstellt keine Apps, verfolgt keine App-Store-Rankings und verspricht keine Einnahmen. Der Datenstand ist August–September 2026.",

    webTitle: "Lies im Browser oder auf dem iPhone",
    webColTitle: "Web-Version",
    webColBody:
      "Dieselben Analysen und Ideen in jedem Browser. Lesezeichen und Notizen bleiben in deinem Browser – und nach der Anmeldung in deinem Konto.",
    iphoneColTitle: "Lies in deiner Sprache, auch offline",
    iphoneColBody:
      "Texte und Illustrationen sind in der App enthalten. Du brauchst kein Konto. Lesezeichen und Notizen bleiben auf deinem Gerät. inApp enthält kein Werbetracking.",

    plusFreeTitle: "Kostenlos",
    plusFree1: "Die vollständige Analyse „{topic}“",
    plusFree2: "{n} Ideen daraus",
    plusFree3: "Katalog aller {topics} Analysen und Suche",
    plusFree4: "Lesezeichen und Notizen",
    plusFree5: "Export der kostenlosen Ideen",
    plusAll1: "Alle {topics} Analysen und {ideas} Ideen",
    plusAll2: "Unbegrenzter Export",
    plusPlansTitle: "In der iPhone-App",
    plusTerms:
      "Beide Optionen sind ab dem Kauf kostenpflichtig, ohne kostenlose Testphase. Der örtliche Preis wird vor dem Kauf angezeigt.",
    plusGet: "Plus schaltest du in der iPhone-App frei. Die kostenlosen Inhalte kannst du auch in der Web-Version lesen.",

    faqTitle: "Häufige Fragen",
    faqMore: "Weitere Fragen",
    faq1Q: "Was ist inApp?",
    faq1A:
      "Eine Bibliothek redaktioneller Analysen und App-Ideen auf Grundlage öffentlicher App-Bewertungen: {topics} Analysen und {ideas} Ideen. Erfahre, was Menschen erreichen möchten, wo bestehende Produkte sie im Stich lassen und welche Fragen du vor der Entwicklung prüfen solltest.",
    faq2Q: "Woher stammen die Analysen und Ideen?",
    faq2A:
      "Die Materialien entstehen aus Rezensionen zu Apps. Die Zitate in den Analysen zeigen, worauf die Schlüsse beruhen. Die {topics} Analysen stützen sich auf {reviews} Bewertungen zu {apps} Apps; das gesamte Recherche-Archiv umfasst {archiveReviews} Bewertungen zu {archiveApps} Apps. Der Datenstand ist August–September 2026, kein Live-Marktfeed. Die meisten Zitate stammen aus englischsprachigen Bewertungen; in anderen Sprachen wird eine Übersetzung angezeigt.",
    faq3Q: "Ist das ein Beweis, dass sich eine Idee lohnt?",
    faq3A:
      "Nein. Es sind Beobachtungen und Ideen zum Überprüfen, keine Versprechen über Nachfrage oder Einnahmen. inApp erstellt keine Apps, verfolgt keine App-Store-Rankings und verspricht keine Einnahmen.",
    faq4Q: "Was ist kostenlos?",
    faq4A:
      "Die Analyse „{topic}“ und {n} Ideen sind ohne Abo verfügbar. inApp Plus öffnet die gesamte Sammlung und unbegrenzten Export.",
    faq5Q: "Wie funktioniert Plus?",
    faq5A:
      "In der iPhone-App ist Plus als Jahresabo mit automatischer Verlängerung oder als lebenslanger Zugang mit einmaliger Zahlung erhältlich. Beide Optionen sind ab dem Kauf kostenpflichtig, ohne kostenlose Testphase. Der örtliche Preis wird vor dem Kauf angezeigt.",
    faq6Q: "Was steckt im Export?",
    faq6A:
      "Eine Textdatei (.txt): die vollständige Kategorie-Analyse, die ganze Idee und deine Notiz. Du kannst sie lesen, bearbeiten oder zusammen mit deiner Frage an eine KI geben.",
    faq7Q: "In welchen Sprachen?",
    faq7A: "Oberfläche und redaktionelle Inhalte sind auf Deutsch, Englisch, Russisch, Französisch und Japanisch verfügbar.",
    faq8Q: "Kann ich offline lesen?",
    faq8A:
      "In der iPhone-App ja: Texte und Illustrationen gehören zur App. Für Kauf und Wiederherstellung des Zugangs ist eine Verbindung zum App Store nötig.",
    faq9Q: "Brauche ich ein Konto, und wo liegen meine Notizen?",
    faq9A:
      "Die iPhone-App braucht kein Konto: Lesezeichen und Notizen bleiben auf dem Gerät, zwischen Geräten wird nichts synchronisiert. In der Web-Version bleiben sie in deinem Browser – und nach der Anmeldung in deinem Konto. Die iPhone-App enthält kein Werbetracking.",
    faq10Q: "Wie kündige ich?",
    faq10A:
      "Bei Käufen im App Store: Wenn du nicht spätestens 24 Stunden vor Ablauf kündigst, verlängert sich das Abo zum angezeigten Jahrespreis. Du kannst es in deinen App Store-Accounteinstellungen verwalten oder kündigen.",

    finalTitle: "Finde deine nächste App-Idee",
  },

  fr: {
    metaTitle: "Idées d’applications et niches tirées des avis – inApp",
    metaDescription:
      "35 décryptages éditoriaux et 293 idées d’applications tirées d’avis publics. Comprends les besoins avant de développer. Un thème complet est gratuit.",
    ogAlt: "inApp – décryptages d’avis et idées d’applications",

    heroEyebrow: "35 thèmes. De vrais avis. De nouvelles pistes.",
    heroTitle: "Trouve ta prochaine idée d’application dans les problèmes que les gens décrivent déjà.",
    heroLead:
      "{topics} décryptages éditoriaux et {ideas} idées d’applications tirés d’avis publics. Découvre ce que les gens cherchent à faire, ce qui les bloque dans les produits existants et les questions à vérifier avant de développer.",
    ctaWeb: "Ouvrir la version web",
    heroMicro: "Un thème complet est gratuit.",
    appStoreSoon: "Bientôt sur l’App Store",
    heroFigure: "Un extrait de décryptage",
    ratingLabel: "Note : {n} sur 5 étoiles",

    numbersTitle: "inApp en chiffres",
    statTopics: "décryptages",
    statIdeas: "idées d’applications",
    statReviews: "avis sur {apps} apps",
    statReviewsHint: "Avis étudiés pour les {topics} décryptages publiés.",
    statLanguages: "langues",
    numbersFootnote: "Données d’août–septembre 2026, pas un flux de marché en direct.",

    freeTitle: "Essaie un décryptage complet gratuitement",
    freeInside: "Au sommaire",
    freeMeta: "{parts} parties · {observations} observations · {ideas} idées",
    freeCta: "Lire gratuitement",

    ideasTitle: "Commence avec 5 idées gratuites",
    allIdeas: "Toutes les idées",

    carouselLabel: "Extraits des décryptages",
    carouselPrev: "Exemple précédent",
    carouselNext: "Exemple suivant",
    carouselPause: "Mettre le défilement en pause",
    carouselPlay: "Lancer le défilement",
    carouselSlide: "Exemple {i} sur {n}",
    openBreakdown: "Ouvrir le décryptage",

    howTitle: "Comment ça marche",
    stepLabel: "Étape {n}",
    step1Title: "Comprends le besoin derrière l’avis",
    step1Body:
      "Chaque décryptage relie des situations récurrentes à des citations choisies et à des pistes d’amélioration.",
    step2Title: "Découvre ce qui fonde chaque idée",
    step2Body: "Explore des idées concrètes, leur public, le problème à résoudre et leurs fondements.",
    step3Title: "Garde tes idées et tes notes",
    step3Body: "Recherche dans la collection, enregistre les contenus utiles et ajoute tes notes.",
    step4Title: "Exporte une idée avec son contexte",
    step4Body:
      "Le décryptage complet de la catégorie, l’idée et ta note — dans un seul fichier. Un seul fichier texte (.txt) : tu peux le lire, le modifier ou le donner à une IA avec ta question.",
    noteSample: "Vérifier avec ma propre pièce : ce qui doit rester en place et ce qui peut changer.",

    topicsKicker: "{n} décryptages",
    topicsShowAll: "Tout afficher ({n})",
    topicsCatalog: "Ouvrir le catalogue des décryptages",

    trustTitle: "Notre façon de lire les avis",
    trust2: "Ce sont des observations et des idées à tester, sans promesse de demande ou de revenus.",
    trust3:
      "inApp ne crée pas d’applications, ne suit pas les classements de l’App Store et ne promet aucun revenu. Les données datent d’août–septembre 2026.",

    webTitle: "Lis dans ton navigateur ou sur iPhone",
    webColTitle: "Version web",
    webColBody:
      "Les mêmes décryptages et idées dans n’importe quel navigateur. Tes signets et tes notes restent dans ton navigateur, puis dans ton compte une fois connecté.",
    iphoneColTitle: "Lis dans ta langue, même hors ligne",
    iphoneColBody:
      "Les textes et les illustrations sont inclus dans l’application. Aucun compte n’est nécessaire. Tes favoris et tes notes restent sur ton appareil. inApp ne contient aucun suivi publicitaire.",

    plusFreeTitle: "Gratuit",
    plusFree1: "Le décryptage complet « {topic} »",
    plusFree2: "{n} idées qui en sont tirées",
    plusFree3: "Catalogue des {topics} décryptages et recherche",
    plusFree4: "Signets et notes",
    plusFree5: "Export des idées gratuites",
    plusAll1: "Les {topics} décryptages et {ideas} idées",
    plusAll2: "Export illimité",
    plusPlansTitle: "Dans l’app iPhone",
    plusTerms: "Les deux options sont payantes dès l’achat, sans essai gratuit. Le prix local est affiché avant l’achat.",
    plusGet: "Plus s’active dans l’app iPhone. Les contenus gratuits se lisent aussi dans la version web.",

    faqTitle: "Questions fréquentes",
    faqMore: "Plus de questions",
    faq1Q: "Qu’est-ce qu’inApp ?",
    faq1A:
      "Une bibliothèque de décryptages éditoriaux et d’idées d’applications tirés d’avis publics : {topics} décryptages et {ideas} idées. Découvre ce que les gens cherchent à faire, ce qui les bloque dans les produits existants et les questions à vérifier avant de développer.",
    faq2Q: "D’où viennent les décryptages et les idées ?",
    faq2A:
      "Les contenus sont construits à partir des avis sur les apps. Les citations dans les décryptages montrent sur quoi reposent les conclusions. Les {topics} décryptages s’appuient sur {reviews} avis portant sur {apps} apps ; l’archive complète compte {archiveReviews} avis sur {archiveApps} apps. Les données datent d’août–septembre 2026 ; ce n’est pas un flux de marché en direct. La plupart des citations viennent d’avis en anglais ; les autres langues en affichent une traduction.",
    faq3Q: "Est-ce une garantie qu’une idée rapportera ?",
    faq3A:
      "Non. Ce sont des observations et des idées à tester, sans promesse de demande ou de revenus. inApp ne crée pas d’applications, ne suit pas les classements de l’App Store et ne promet aucun revenu.",
    faq4Q: "Qu’est-ce qui est gratuit ?",
    faq4A:
      "Le décryptage « {topic} » et {n} idées sont accessibles sans abonnement. inApp Plus donne accès à toute la collection et à l’exportation illimitée.",
    faq5Q: "Comment fonctionne Plus ?",
    faq5A:
      "Dans l’app iPhone, Plus est disponible par abonnement annuel à renouvellement automatique ou en accès à vie avec un paiement unique, sans renouvellement. Les deux options sont payantes dès l’achat, sans essai gratuit. Le prix local est affiché avant l’achat.",
    faq6Q: "Que contient l’export ?",
    faq6A:
      "Un seul fichier texte (.txt) : le décryptage complet de la catégorie, l’idée en entier et ta note. Tu peux le lire, le modifier ou le donner à une IA avec ta question.",
    faq7Q: "Dans quelles langues ?",
    faq7A: "L’interface et les contenus éditoriaux sont disponibles en français, anglais, russe, allemand et japonais.",
    faq8Q: "Puis-je lire hors ligne ?",
    faq8A:
      "Dans l’app iPhone, oui : les textes et les illustrations sont inclus dans l’app. L’achat et la restauration de l’accès nécessitent une connexion à l’App Store.",
    faq9Q: "Faut-il un compte, et où sont mes notes ?",
    faq9A:
      "L’app iPhone ne demande aucun compte : les signets et les notes restent sur l’appareil, sans synchronisation entre appareils. Dans la version web, ils restent dans ton navigateur, puis dans ton compte une fois connecté. L’app iPhone ne contient aucun suivi publicitaire.",
    faq10Q: "Comment résilier ?",
    faq10A:
      "Pour les achats sur l’App Store : sans annulation au moins 24 heures avant la fin de la période en cours, l’abonnement est renouvelé au prix annuel indiqué. Tu peux le gérer ou l’annuler dans les réglages de ton compte App Store.",

    finalTitle: "Trouve ta prochaine idée d’application",
  },

  ja: {
    metaTitle: "アプリ市場調査とアイデア図鑑｜口コミから探る35分野 – inApp",
    metaDescription:
      "公開されているアプリの口コミをもとに編集した35分野の分析と293のアプリアイデア。開発を始める前に、実際の口コミからニーズを読み解けます。ひとつの分野を無料で読めます。",
    ogAlt: "inApp – 口コミの分析とアプリのアイデア",

    heroEyebrow: "35の分野。実際の口コミ。新たな可能性。",
    heroTitle: "次のアプリのアイデアを、すでに語られているユーザーの悩みから見つけよう。",
    heroLead:
      "公開されているアプリの口コミをもとに編集した{topics}分野の分析と{ideas}のアプリアイデア。人々が何をしたいのか、既存の製品のどこで困っているのか、開発を始める前に何を確かめるべきかを読み解けます。",
    ctaWeb: "Web版を開く",
    heroMicro: "ひとつの分野を無料で読めます。",
    appStoreSoon: "App Storeで近日公開",
    heroFigure: "分析の一例",
    ratingLabel: "評価：5つ星中{n}",

    numbersTitle: "数字で見るinApp",
    statTopics: "分野の分析",
    statIdeas: "アプリアイデア",
    statReviews: "件の口コミ（{apps}アプリ）",
    statReviewsHint: "公開中の{topics}分野の分析のために調べた口コミの数です。",
    statLanguages: "言語",
    numbersFootnote: "2026年8〜9月時点の口コミデータです。リアルタイムの市場情報ではありません。",

    freeTitle: "まずは無料で、ひとつの分野をじっくり",
    freeInside: "内容",
    freeMeta: "{parts}部構成・{observations}つの所見・{ideas}つのアイデア",
    freeCta: "無料で読む",

    ideasTitle: "まずは5つの無料アイデアから",
    allIdeas: "すべてのアイデア",

    carouselLabel: "分析の例",
    carouselPrev: "前の例",
    carouselNext: "次の例",
    carouselPause: "自動再生を止める",
    carouselPlay: "自動再生を始める",
    carouselSlide: "{n}件中{i}件目の例",
    openBreakdown: "分析を開く",

    howTitle: "使い方",
    stepLabel: "ステップ{n}",
    step1Title: "口コミの奥にあるニーズを知る",
    step1Body: "各分析では、繰り返し現れる状況を、選び抜いた口コミの引用や改善案と結び付けています。",
    step2Title: "アイデアの理由を深く知ろう",
    step2Body: "誰のためのアイデアなのか、どんな課題を解決するのか、その根拠は何かを確認できます。",
    step3Title: "発見とメモをひとつの場所に",
    step3Body: "コレクション内を検索し、役立つ内容を保存し、自分のメモを加えられます。",
    step4Title: "アイデアを背景情報と一緒に書き出す",
    step4Body:
      "カテゴリーの分析全文、アイデア、自分のメモを一つのファイルに。テキストファイル一つ（.txt）。読むことも、編集することも、質問といっしょにAIに渡すこともできます。",
    noteSample: "自分の部屋で確かめる：動かせないものと、変えてもいいもの。",

    topicsKicker: "{n}分野の分析",
    topicsShowAll: "{n}件すべて表示",
    topicsCatalog: "分析の一覧を開く",

    trustTitle: "口コミの扱い方",
    trust2: "掲載内容は検証のための観察とアイデアであり、需要や収益を保証するものではありません。",
    trust3:
      "inAppはアプリを自動生成せず、App Storeの順位も追跡せず、収益も約束しません。口コミデータは2026年8〜9月時点のものです。",

    webTitle: "ブラウザでも、iPhoneでも",
    webColTitle: "Web版",
    webColBody:
      "同じ分析とアイデアを、どのブラウザでも。ブックマークとメモはブラウザに保存され、ログインするとアカウントに保存されます。",
    iphoneColTitle: "日本語で、オフラインでも読める",
    iphoneColBody:
      "文章とイラストはアプリに含まれているため、読書に通信は不要です。アカウント登録も不要。ブックマークとメモは端末内に保存されます。広告目的の追跡はありません。",

    plusFreeTitle: "無料",
    plusFree1: "「{topic}」の分析全文",
    plusFree2: "そこからの{n}つのアイデア",
    plusFree3: "{topics}分野すべての目録と検索",
    plusFree4: "ブックマークとメモ",
    plusFree5: "無料アイデアの書き出し",
    plusAll1: "{topics}分野すべての分析と{ideas}のアイデア",
    plusAll2: "書き出し無制限",
    plusPlansTitle: "iPhoneアプリでは",
    plusTerms: "どちらのプランも購入時から有料で、無料体験はありません。地域ごとの価格は購入前に表示されます。",
    plusGet: "PlusはiPhoneアプリで利用できます。無料の内容はWeb版でも読めます。",

    faqTitle: "よくある質問",
    faqMore: "その他の質問",
    faq1Q: "inAppとは？",
    faq1A:
      "公開されているアプリの口コミをもとに編集した、{topics}分野の分析と{ideas}のアプリアイデアのライブラリです。人々が何をしたいのか、既存の製品のどこで困っているのか、開発を始める前に何を確かめるべきかを読み解けます。",
    faq2Q: "分析とアイデアはどこから来ていますか？",
    faq2A:
      "資料はアプリのレビューをもとにつくられています。分析の中の引用は、結論が何にもとづくかを示します。{topics}分野の分析は{apps}アプリについての{reviews}件の口コミにもとづき、調査アーカイブ全体では{archiveApps}アプリの{archiveReviews}件になります。データは2026年8〜9月時点のもので、リアルタイムの市場情報ではありません。引用の多くは英語の口コミからのもので、他の言語では翻訳を表示しています。",
    faq3Q: "アイデアが収益になる保証はありますか？",
    faq3A:
      "いいえ。掲載内容は検証のための観察とアイデアであり、需要や収益を保証するものではありません。inAppはアプリを自動生成せず、App Storeの順位も追跡せず、収益も約束しません。",
    faq4Q: "無料で読めるのは？",
    faq4A:
      "「{topic}」の分析と{n}つのアイデアは、サブスクリプションなしで読めます。inApp Plusでは、すべての分野とアイデアを閲覧でき、書き出しも無制限になります。",
    faq5Q: "Plusのプランは？",
    faq5A:
      "iPhoneアプリでは、Plusは自動更新の年間サブスクリプション、または一括払いの買い切りプランから選べます。どちらのプランも購入時から有料で、無料体験はありません。地域ごとの価格は購入前に表示されます。",
    faq6Q: "書き出しには何が入りますか？",
    faq6A:
      "テキストファイル一つ（.txt）に、カテゴリーの分析全文、アイデアの全文、あなたのメモが入ります。読むことも、編集することも、質問といっしょにAIに渡すこともできます。",
    faq7Q: "対応言語は？",
    faq7A: "画面と編集記事は日本語、英語、ロシア語、ドイツ語、フランス語に対応しています。",
    faq8Q: "オフラインで読めますか？",
    faq8A:
      "iPhoneアプリなら読めます。本文と図版はアプリに同梱されています。購入とアクセスの復元にはApp Storeへの接続が必要です。",
    faq9Q: "アカウントは必要？メモはどこに保存されますか？",
    faq9A:
      "iPhoneアプリではアカウントは不要です。ブックマークとメモは端末に保存され、端末間の同期はありません。Web版ではブラウザに保存され、ログインするとアカウントに保存されます。iPhoneアプリには広告目的の追跡はありません。",
    faq10Q: "解約するには？",
    faq10A:
      "App Storeで購入した場合、現在の期間が終わる24時間前までに解約しないと、表示された年額で自動更新されます。管理や解約はApp Storeのアカウント設定から行えます。",

    finalTitle: "次のアプリのアイデアを見つけよう",
  },
});

export type LandingStrings = (typeof landingStrings)["ru"];

/** FAQ order (spec 08 S11): the first six are open, the rest sit behind «Ещё вопросы». */
export const FAQ_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
export const FAQ_VISIBLE = 6;

/** og:locale per page locale (spec 08 §5). */
export const OG_LOCALE = { ru: "ru_RU", en: "en_US", de: "de_DE", fr: "fr_FR", ja: "ja_JP" } as const;
