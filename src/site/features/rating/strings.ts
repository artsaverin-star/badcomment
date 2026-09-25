import type { Locale } from "../../i18n/locales";
import { defineStrings } from "../../i18n/strings";

// Web-only strings of «Рейтинг» (/<L>/rating, /<L>/rating/<niche>, …/<app>, …/tasks/<n>;
// spec 11 §7.1). Everything the app itself says on these screens comes from the app packs
// through t() (keys.ts for the client parts); this table holds only what the app does not have:
// SEO meta and head terms, the catalogue groups, the niche page's leaders, controls and legend,
// the row labels, the screenshot alts and viewer, the app page's facts and cross-links, and the
// review archive's rows into the rating (W7, W8). The rating texts themselves are data (ru for
// ru pages, English for the others).
// Word forms: "one|few|many|other" (i18n/count.ts: counted / countWord). Voice: the app's —
// «оценка в App Store», «тема»; informal ты / du / tu; Japanese です・ます like ui.ja.json.
// fr: U+00A0 before : ; ! ? » and after « (lint-web-strings.mjs). No leading/trailing spaces:
// the narrow rank label is one template, `rankShort` (score.tsx rankVars splits it).
// Server code reads `ratingStrings[L]`; client components get the part of the page locale's row
// they read (RATING_CLIENT_FIELDS) through <I18nProvider web={{ rating: ratingClientStrings(L) }}>
// and read it with useWeb<RatingClientStrings>("rating").

export const ratingStrings = defineStrings({
  ru: {
    // SEO (spec 11 §6.1). {topics} = counted(71, topicsInWord); {name} = h1Name (ru/en seoName,
    // de/fr/ja the topic name); {apps} = counted(count, appsWord).
    metaTitle: "Рейтинг приложений по отзывам: лучшие в {topics}",
    metaDescription:
      "До 100 приложений в каждой теме: оценка по текстам отзывов, оценка в App Store, скриншоты, что хвалят и на что жалуются. Бесплатно и без регистрации.",
    topicsInWord: "теме|темах|темах|темах",
    nicheMetaTitle: "Лучшие приложения для {name}: топ-{count} по отзывам",
    nicheMetaTitleShort: "Лучшие приложения для {name}: топ-{count}",
    nicheMetaDescription:
      "{apps} для {name} по {reviews}. Лидеры: {top}. Для каждого — скриншоты, что хвалят и на что жалуются.",
    appMetaTitle: "{app}: отзывы, плюсы и минусы",
    // An app rated in 2+ niches: the niche keeps its <title>s unique. It comes last, so a cut in
    // the search results drops it and not the query words; the short form when the long is too wide.
    appMetaTitleNiche: "{app}: отзывы, плюсы и минусы ({niche})",
    appMetaTitleNicheShort: "{app}: отзывы ({niche})",
    // The app description of an app without a verdict (seo.ts appDescription).
    appMetaDescription:
      "{app}: для каких задач используют, что хвалят и на что жалуются в отзывах. Оценка по отзывам — {score} из 100, в App Store — {star}.",
    appMetaFacts: "Оценка по отзывам — {score} из 100, в App Store — {star}.",
    taskMetaTitle: "{audience}: приложения для {name}",
    // de/fr/ja pages print the English rating data.
    dataNote: "",

    // Catalogue (§4.1).
    catalogTitle: "Рейтинг приложений по отзывам",
    catalogLead: "{apps} в {topics}: оценка по текстам отзывов, скриншоты, что хвалят и на что жалуются.",
    groupsLabel: "Разделы",
    nicheCardMeta: "{apps} · {reviews}",
    leaderLine: "Лидер: {app} — {score} из 100",
    // A catalogue search row: niche, rank, store star.
    searchContext: "{niche} · № {rank} · {star}",
    group_health: "Здоровье",
    group_sport: "Спорт и активность",
    group_mind: "Привычки и спокойствие",
    group_work: "Работа и дела",
    group_ai: "Искусственный интеллект",
    group_learn: "Учёба и языки",
    group_money: "Деньги",
    group_media: "Фото, видео и музыка",
    group_home: "Дом и семья",
    group_everyday: "Покупки, поездки и общение",

    // Niche (§4.2).
    nicheH1: "Лучшие приложения для {name}",
    nicheSubtitle: "{name} · {apps} · {reviews}",
    nicheLead: "Самая высокая оценка по текстам отзывов — у {top}.",
    topFirst: "{app} ({score} из 100)",
    topNext: "{app} ({score})",
    topTitle: "Топ-{count} по оценке отзывов",
    leadersTitle: "Тройка лидеров",
    restTitle: "Места {from}–{to}",
    sortReview: "По отзывам",
    sortStore: "По App Store",
    sortRatings: "Популярные",
    sortName: "По названию",
    legend: "Место — по оценке текстов отзывов (из 100). ★ — оценка в App Store.",
    relatedTitle: "Похожие темы",

    // Rows, leaders, mini rows (§3.3–§3.7).
    rankShort: "№ {n}",
    rankA11y: "Место {n}",
    rankBadge: "№ {n} по отзывам",
    scoreA11y: "Оценка по отзывам: {score} из 100",
    outOf100: "из 100",
    storeA11y: "Оценка в App Store:",
    storeMeta: "{star} · {ratings}",
    praised: "Хвалят:",
    complained: "Жалуются:",
    forWhom: "Кому:",
    openApp: "Открыть разбор приложения",
    moreApps: "{names} и ещё {n}",

    // Screenshots (§3.4, §6.6).
    shotsTitle: "Скриншоты",
    shotsLabel: "Скриншоты {app}",
    shotAlt: "{app}: скриншот {n} из {count}",
    iconAlt: "Иконка {app}",
    prevShot: "Предыдущий скриншот",
    nextShot: "Следующий скриншот",
    viewerCount: "{n} из {count}",

    // App page (§4.3).
    heroRank: "№ {rank} из {count} в теме «{niche}»",
    ratingsLabelWord: "оценка в App Store|оценки в App Store|оценок в App Store|оценки в App Store",
    reviewsReadLabelWord: "отзыв прочитан|отзыва прочитано|отзывов прочитано|отзыва прочитано",
    appTasksTitle: "Упоминается в задачах",
    alternativesTitle: "Другие приложения в теме",
    wholeNicheTitle: "Весь рейтинг: {name}",
    wholeNicheBody: "{apps} со скриншотами и оценками",
    otherNichesTitle: "В других рейтингах",
    otherNicheLine: "№ {rank} из {count}",
    // Task page (§4.4).
    otherTasksTitle: "Другие задачи в теме",

    // Counted words.
    appsWord: "приложение|приложения|приложений|приложения",
    reviewsWord: "отзыв|отзыва|отзывов|отзыва",
    // «по 31 241 отзыву» (nicheMetaDescription).
    reviewsByWord: "отзыву|отзывам|отзывам|отзыва",
    reviewsReadWord: "прочитанный отзыв|прочитанных отзыва|прочитанных отзывов|прочитанного отзыва",
    ratingsWord: "оценка|оценки|оценок|оценки",
    // W3: the method section's count line in ru («%1$@ приложений и %2$@ прочитанных отзывов»).
    methodCounts:
      "В архивной выборке этой темы: {apps} и {reviews}. Это общий объём исследования, не число отзывов у каждого приложения.",
    methodReviewsWord: "прочитанный отзыв|прочитанных отзыва|прочитанных отзывов|прочитанного отзыва",
    // W2: «Опыт пользователей» count line (976 apps have exactly one quote).
    quotesNote: "{count}. Это отдельные случаи, а не оценка всех пользователей.",
    quotesWord: "фрагмент из разбора|фрагмента из разбора|фрагментов из разбора|фрагмента из разбора",
    // W11: «Открыть в App Store» opens a new tab.
    newTab: "(откроется в новой вкладке)",
    // W7, W8: rows into the rating from the review archive.
    appRatingTitle: "Оценка и разбор приложения",
    appRatingBody: "Оценка по отзывам, что хвалят и на что жалуются",
    nicheRatingTitle: "Рейтинг приложений темы",
    nicheRatingBody: "Оценка по отзывам и оценка магазина для каждого приложения",
  },
  en: {
    metaTitle: "App ratings from real reviews: the best apps in {topics}",
    metaDescription:
      "Up to 100 apps per topic: a score from review text, the App Store rating, screenshots, what people praise and what they complain about. Free, no sign-up.",
    topicsInWord: "topic|topics|topics|topics",
    nicheMetaTitle: "Best {name} apps: top {count} by reviews",
    nicheMetaTitleShort: "Best {name} apps: top {count}",
    nicheMetaDescription: "{count} {name} apps ranked from {reviews}. Top: {top}. Screenshots, praise and complaints for each.",
    appMetaTitle: "{app} review: pros and cons",
    appMetaTitleNiche: "{app} review: pros and cons ({niche})",
    appMetaTitleNicheShort: "{app} review ({niche})",
    appMetaDescription:
      "{app}: what people use it for, what they praise and what they complain about in reviews. Review score: {score}/100; App Store rating: {star}.",
    appMetaFacts: "Review score: {score}/100; App Store: {star}.",
    taskMetaTitle: "{audience}: {name} apps",
    dataNote: "",

    catalogTitle: "App ratings from real reviews",
    catalogLead: "{apps} in {topics}: a score from review text, screenshots, what people praise and what they complain about.",
    groupsLabel: "Sections",
    nicheCardMeta: "{apps} · {reviews}",
    leaderLine: "Top: {app}, {score}/100",
    searchContext: "{niche} · #{rank} · {star}",
    group_health: "Health",
    group_sport: "Sport and activity",
    group_mind: "Habits and calm",
    group_work: "Work and tasks",
    group_ai: "AI",
    group_learn: "Learning and languages",
    group_money: "Money",
    group_media: "Photo, video and music",
    group_home: "Home and family",
    group_everyday: "Shopping, travel and chat",

    nicheH1: "Best {name} apps",
    nicheSubtitle: "{name} · {apps} · {reviews}",
    nicheLead: "The highest review-text scores: {top}.",
    topFirst: "{app} ({score}/100)",
    topNext: "{app} ({score})",
    topTitle: "Top {count} by review score",
    leadersTitle: "Top three",
    restTitle: "Ranks {from}–{to}",
    sortReview: "Review score",
    sortStore: "App Store",
    sortRatings: "Most rated",
    sortName: "Name",
    legend: "Rank follows the review-text score (out of 100). ★ is the App Store rating.",
    relatedTitle: "Related topics",

    rankShort: "#{n}",
    rankA11y: "Rank {n}",
    rankBadge: "#{n} by reviews",
    scoreA11y: "Review score: {score} out of 100",
    outOf100: "of 100",
    storeA11y: "App Store rating:",
    storeMeta: "{star} · {ratings}",
    praised: "Praised:",
    complained: "Complaints:",
    forWhom: "Best for:",
    openApp: "Open the app breakdown",
    moreApps: "{names} and {n} more",

    shotsTitle: "Screenshots",
    shotsLabel: "{app} screenshots",
    shotAlt: "{app} screenshot {n} of {count}",
    iconAlt: "{app} icon",
    prevShot: "Previous screenshot",
    nextShot: "Next screenshot",
    viewerCount: "{n} of {count}",

    heroRank: "#{rank} of {count} in {niche}",
    ratingsLabelWord:
      "rating on the App Store|ratings on the App Store|ratings on the App Store|ratings on the App Store",
    reviewsReadLabelWord: "review read|reviews read|reviews read|reviews read",
    appTasksTitle: "Mentioned for these jobs",
    alternativesTitle: "Other apps in this topic",
    wholeNicheTitle: "Full ranking: {name}",
    wholeNicheBody: "{apps} with screenshots and scores",
    otherNichesTitle: "In other rankings",
    otherNicheLine: "#{rank} of {count}",
    otherTasksTitle: "Other jobs in this topic",

    appsWord: "app|apps|apps|apps",
    reviewsWord: "review|reviews|reviews|reviews",
    reviewsByWord: "review|reviews|reviews|reviews",
    reviewsReadWord: "review read|reviews read|reviews read|reviews read",
    ratingsWord: "rating|ratings|ratings|ratings",
    methodCounts: "",
    methodReviewsWord: "",
    quotesNote: "{count}. These are individual cases, not a verdict on all users.",
    quotesWord:
      "excerpt from the breakdown|excerpts from the breakdown|excerpts from the breakdown|excerpts from the breakdown",
    newTab: "(opens in a new tab)",
    appRatingTitle: "The app’s score and breakdown",
    appRatingBody: "The review score, what people praise and what they complain about",
    nicheRatingTitle: "App ratings in this topic",
    nicheRatingBody: "The review score and the store rating of every app",
  },
  de: {
    metaTitle: "App-Bewertungen aus echten Rezensionen: die besten Apps in {topics}",
    metaDescription:
      "Bis zu 100 Apps pro Thema: Wert aus den Rezensionstexten, App-Store-Bewertung, Screenshots, Lob und Kritik. Kostenlos, ohne Anmeldung.",
    topicsInWord: "Thema|Themen|Themen|Themen",
    nicheMetaTitle: "Die besten Apps: {name}, Top {count} nach Rezensionen",
    nicheMetaTitleShort: "Die besten Apps: {name}, Top {count}",
    nicheMetaDescription:
      "{apps} im Thema {name}, bewertet nach {reviews}. Vorn: {top}. Zu jeder App Screenshots, Lob und Kritik.",
    appMetaTitle: "{app}: Rezensionen, Vor- und Nachteile",
    appMetaTitleNiche: "{app}: Rezensionen, Vor- und Nachteile ({niche})",
    appMetaTitleNicheShort: "{app}: Rezensionen ({niche})",
    appMetaDescription:
      "{app}: wofür die App genutzt wird, was in Rezensionen gelobt und was bemängelt wird. Wert aus Rezensionen: {score}/100; App-Store-Bewertung: {star}.",
    appMetaFacts: "Wert aus Rezensionen: {score}/100; App Store: {star}.",
    taskMetaTitle: "{audience}: Apps im Thema {name}",
    dataNote: "Die Texte zu den Apps sind auf Englisch.",

    catalogTitle: "App-Bewertungen aus echten Rezensionen",
    catalogLead: "{apps} in {topics}: ein Wert aus den Rezensionstexten, Screenshots, was gelobt und was bemängelt wird.",
    groupsLabel: "Bereiche",
    nicheCardMeta: "{apps} · {reviews}",
    leaderLine: "Vorn: {app}, {score}/100",
    searchContext: "{niche} · Platz {rank} · {star}",
    group_health: "Gesundheit",
    group_sport: "Sport und Bewegung",
    group_mind: "Gewohnheiten und Ruhe",
    group_work: "Arbeit und Aufgaben",
    group_ai: "KI",
    group_learn: "Lernen und Sprachen",
    group_money: "Geld",
    group_media: "Foto, Video und Musik",
    group_home: "Zuhause und Familie",
    group_everyday: "Einkaufen, Reisen und Chat",

    nicheH1: "Die besten Apps: {name}",
    nicheSubtitle: "{name} · {apps} · {reviews}",
    nicheLead: "Die besten Werte aus den Rezensionstexten: {top}.",
    topFirst: "{app} ({score}/100)",
    topNext: "{app} ({score})",
    topTitle: "Top {count} nach Wert aus Rezensionen",
    leadersTitle: "Die ersten drei",
    restTitle: "Plätze {from}–{to}",
    sortReview: "Rezensionen",
    sortStore: "App Store",
    sortRatings: "Meistbewertet",
    sortName: "Name",
    legend: "Der Platz folgt dem Wert aus den Rezensionstexten (von 100). ★ ist die App-Store-Bewertung.",
    relatedTitle: "Ähnliche Themen",

    rankShort: "Nr. {n}",
    rankA11y: "Platz {n}",
    rankBadge: "Platz {n} nach Rezensionen",
    scoreA11y: "Wert aus Rezensionen: {score} von 100",
    outOf100: "von 100",
    storeA11y: "App-Store-Bewertung:",
    storeMeta: "{star} · {ratings}",
    praised: "Gelobt:",
    complained: "Kritik:",
    forWhom: "Für wen:",
    openApp: "Analyse der App öffnen",
    moreApps: "{names} und {n} weitere",

    shotsTitle: "Screenshots",
    shotsLabel: "Screenshots von {app}",
    shotAlt: "{app}: Screenshot {n} von {count}",
    iconAlt: "Symbol von {app}",
    prevShot: "Vorheriger Screenshot",
    nextShot: "Nächster Screenshot",
    viewerCount: "{n} von {count}",

    heroRank: "Platz {rank} von {count} im Thema {niche}",
    ratingsLabelWord: "Bewertung im App Store|Bewertungen im App Store|Bewertungen im App Store|Bewertungen im App Store",
    reviewsReadLabelWord: "Rezension gelesen|Rezensionen gelesen|Rezensionen gelesen|Rezensionen gelesen",
    appTasksTitle: "Genannt für diese Aufgaben",
    alternativesTitle: "Weitere Apps in diesem Thema",
    wholeNicheTitle: "Gesamte Rangliste: {name}",
    wholeNicheBody: "{apps} mit Screenshots und Werten",
    otherNichesTitle: "In anderen Ranglisten",
    otherNicheLine: "Platz {rank} von {count}",
    otherTasksTitle: "Weitere Aufgaben in diesem Thema",

    appsWord: "App|Apps|Apps|Apps",
    reviewsWord: "Rezension|Rezensionen|Rezensionen|Rezensionen",
    reviewsByWord: "Rezension|Rezensionen|Rezensionen|Rezensionen",
    reviewsReadWord: "gelesene Rezension|gelesene Rezensionen|gelesene Rezensionen|gelesene Rezensionen",
    ratingsWord: "Bewertung|Bewertungen|Bewertungen|Bewertungen",
    methodCounts: "",
    methodReviewsWord: "",
    quotesNote: "{count}. Das sind Einzelfälle, kein Urteil über alle Nutzer.",
    quotesWord: "Auszug aus der Analyse|Auszüge aus der Analyse|Auszüge aus der Analyse|Auszüge aus der Analyse",
    newTab: "(öffnet sich in einem neuen Tab)",
    appRatingTitle: "Wert und Analyse der App",
    appRatingBody: "Wert aus Rezensionen, was gelobt und was bemängelt wird",
    nicheRatingTitle: "App-Bewertungen in diesem Thema",
    nicheRatingBody: "Wert aus Rezensionen und Store-Bewertung jeder App",
  },
  fr: {
    metaTitle: "Classement des apps d’après de vrais avis : les meilleures dans {topics}",
    metaDescription:
      "Jusqu’à 100 apps par thème : note tirée du texte des avis, note de l’App Store, captures d’écran, points forts et reproches. Gratuit, sans inscription.",
    topicsInWord: "thème|thèmes|thèmes|thèmes",
    nicheMetaTitle: "Meilleures applis : {name}, top {count} d’après les avis",
    nicheMetaTitleShort: "Meilleures applis : {name}, top {count}",
    nicheMetaDescription:
      "{apps} du thème {name}, classées d’après {reviews}. En tête : {top}. Pour chaque app : captures d’écran, points forts et reproches.",
    appMetaTitle: "{app} : avis, points forts et points faibles",
    appMetaTitleNiche: "{app} : avis, points forts et points faibles ({niche})",
    appMetaTitleNicheShort: "{app} : avis ({niche})",
    appMetaDescription:
      "{app} : à quoi elle sert, ce qui est salué et ce qui est reproché dans les avis. Note des avis : {score}/100 ; note sur l’App Store : {star}.",
    appMetaFacts: "Note des avis : {score}/100 ; App Store : {star}.",
    taskMetaTitle: "{audience} : apps du thème {name}",
    dataNote: "Les textes sur les apps sont en anglais.",

    catalogTitle: "Classement des apps d’après de vrais avis",
    catalogLead:
      "{apps} dans {topics} : une note tirée du texte des avis, des captures d’écran, ce qui est salué et ce qui est reproché.",
    groupsLabel: "Rubriques",
    nicheCardMeta: "{apps} · {reviews}",
    leaderLine: "En tête : {app}, {score}/100",
    searchContext: "{niche} · n° {rank} · {star}",
    group_health: "Santé",
    group_sport: "Sport et activité",
    group_mind: "Habitudes et sérénité",
    group_work: "Travail et tâches",
    group_ai: "IA",
    group_learn: "Études et langues",
    group_money: "Argent",
    group_media: "Photo, vidéo et musique",
    group_home: "Maison et famille",
    group_everyday: "Achats, trajets et messagerie",

    nicheH1: "Les meilleures applis : {name}",
    nicheSubtitle: "{name} · {apps} · {reviews}",
    nicheLead: "Les meilleures notes d’après le texte des avis : {top}.",
    topFirst: "{app} ({score}/100)",
    topNext: "{app} ({score})",
    topTitle: "Top {count} selon la note des avis",
    leadersTitle: "Le trio de tête",
    restTitle: "Places {from} à {to}",
    sortReview: "Avis",
    sortStore: "App Store",
    sortRatings: "Les plus notées",
    sortName: "Nom",
    legend: "Le rang suit la note tirée du texte des avis (sur 100). ★ est la note de l’App Store.",
    relatedTitle: "Thèmes proches",

    rankShort: "n° {n}",
    rankA11y: "Rang {n}",
    rankBadge: "N° {n} d’après les avis",
    scoreA11y: "Note des avis : {score} sur 100",
    outOf100: "sur 100",
    storeA11y: "Note sur l’App Store :",
    storeMeta: "{star} · {ratings}",
    praised: "Points forts :",
    complained: "Reproches :",
    forWhom: "Pour qui :",
    openApp: "Ouvrir le décryptage de l’app",
    moreApps: "{names} et {n} autres",

    shotsTitle: "Captures d’écran",
    shotsLabel: "Captures d’écran de {app}",
    shotAlt: "{app} : capture d’écran {n} sur {count}",
    iconAlt: "Icône de {app}",
    prevShot: "Capture précédente",
    nextShot: "Capture suivante",
    viewerCount: "{n} sur {count}",

    heroRank: "N° {rank} sur {count} dans le thème {niche}",
    ratingsLabelWord: "note sur l’App Store|notes sur l’App Store|notes sur l’App Store|notes sur l’App Store",
    reviewsReadLabelWord: "avis lu|avis lus|avis lus|avis lus",
    appTasksTitle: "Citée pour ces besoins",
    alternativesTitle: "Autres apps de ce thème",
    wholeNicheTitle: "Classement complet : {name}",
    wholeNicheBody: "{apps} avec captures et notes",
    otherNichesTitle: "Dans d’autres classements",
    otherNicheLine: "N° {rank} sur {count}",
    otherTasksTitle: "Autres besoins de ce thème",

    appsWord: "app|apps|apps|apps",
    reviewsWord: "avis|avis|avis|avis",
    reviewsByWord: "avis|avis|avis|avis",
    reviewsReadWord: "avis lu|avis lus|avis lus|avis lus",
    ratingsWord: "note|notes|notes|notes",
    methodCounts: "",
    methodReviewsWord: "",
    quotesNote: "{count}. Ce sont des cas individuels, pas un verdict sur tous les utilisateurs.",
    quotesWord: "extrait du décryptage|extraits du décryptage|extraits du décryptage|extraits du décryptage",
    newTab: "(s’ouvre dans un nouvel onglet)",
    appRatingTitle: "Note et décryptage de l’app",
    appRatingBody: "La note des avis, ce qui est salué et ce qui est reproché",
    nicheRatingTitle: "Classement des apps du thème",
    nicheRatingBody: "La note des avis et la note de la boutique pour chaque app",
  },
  ja: {
    metaTitle: "実際のレビューにもとづくアプリ評価：{topics}のおすすめ",
    metaDescription:
      "各テーマ最大100アプリ。レビュー本文のスコア、App Storeの評価、スクリーンショット、評価点と不満点。無料・登録不要。",
    topicsInWord: "テーマ",
    nicheMetaTitle: "おすすめアプリ：{name}（レビューで選んだトップ{count}）",
    nicheMetaTitleShort: "おすすめアプリ：{name}（トップ{count}）",
    nicheMetaDescription:
      "{name}の{apps}を{reviews}から比較しています。上位は{top}です。各アプリのスクリーンショット、評価点、不満点を掲載しています。",
    appMetaTitle: "{app}の評判と長所・短所",
    appMetaTitleNiche: "{app}の評判と長所・短所（{niche}）",
    appMetaTitleNicheShort: "{app}の評判（{niche}）",
    appMetaDescription:
      "{app}の使われ方、レビューで評価されている点と不満点。レビュースコア：{score}/100、App Storeの評価：{star}。",
    appMetaFacts: "レビュースコア{score}/100、App Store {star}。",
    taskMetaTitle: "{audience}向け：{name}のアプリ",
    dataNote: "アプリについての本文は英語です。",

    catalogTitle: "実際のレビューにもとづくアプリ評価",
    catalogLead: "{topics}の{apps}。レビュー本文にもとづくスコア、スクリーンショット、評価されている点と不満点をまとめています。",
    groupsLabel: "カテゴリー",
    nicheCardMeta: "{apps}・{reviews}",
    leaderLine: "1位：{app}（{score}/100）",
    searchContext: "{niche}・{rank}位・{star}",
    group_health: "健康",
    group_sport: "スポーツとアクティビティ",
    group_mind: "習慣と心の安定",
    group_work: "仕事とタスク",
    group_ai: "AI",
    group_learn: "学習と語学",
    group_money: "お金",
    group_media: "写真・動画・音楽",
    group_home: "家庭と家族",
    group_everyday: "買い物・移動・コミュニケーション",

    nicheH1: "おすすめアプリ：{name}",
    nicheSubtitle: "{name}・{apps}・{reviews}",
    nicheLead: "レビュー本文のスコアが高いのは{top}です。",
    topFirst: "{app}（{score}/100）",
    topNext: "{app}（{score}）",
    topTitle: "レビュースコア上位{count}",
    leadersTitle: "上位3アプリ",
    restTitle: "{from}〜{to}位",
    sortReview: "レビュー",
    sortStore: "App Store",
    sortRatings: "評価数",
    sortName: "名前",
    legend: "順位はレビュー本文のスコア（100点満点）順です。★はApp Storeの評価です。",
    relatedTitle: "関連するテーマ",

    rankShort: "{n}位",
    rankA11y: "{n}位",
    rankBadge: "レビュー{n}位",
    scoreA11y: "レビュースコア：{score}/100",
    outOf100: "/100",
    storeA11y: "App Storeの評価：",
    storeMeta: "{star}・{ratings}",
    praised: "評価点：",
    complained: "不満点：",
    forWhom: "向いている人：",
    openApp: "アプリの分析を開く",
    moreApps: "{names}ほか{n}件",

    shotsTitle: "スクリーンショット",
    shotsLabel: "{app}のスクリーンショット",
    shotAlt: "{app}のスクリーンショット（{n}/{count}）",
    iconAlt: "{app}のアイコン",
    prevShot: "前のスクリーンショット",
    nextShot: "次のスクリーンショット",
    viewerCount: "{n}/{count}",

    heroRank: "{niche}で{count}件中{rank}位",
    ratingsLabelWord: "件の評価（App Store）",
    reviewsReadLabelWord: "件のレビューを分析",
    appTasksTitle: "この課題で挙げられています",
    alternativesTitle: "このテーマのほかのアプリ",
    wholeNicheTitle: "ランキング全体：{name}",
    wholeNicheBody: "スクリーンショットとスコア付きの{apps}",
    otherNichesTitle: "ほかのランキング",
    otherNicheLine: "{count}件中{rank}位",
    otherTasksTitle: "このテーマのほかの課題",

    appsWord: "アプリ",
    reviewsWord: "件のレビュー",
    reviewsByWord: "件のレビュー",
    reviewsReadWord: "件のレビューを分析",
    ratingsWord: "件の評価",
    methodCounts: "",
    methodReviewsWord: "",
    quotesNote: "分析からの抜粋{count}。個別の事例であり、すべてのユーザーの評価ではありません。",
    quotesWord: "件",
    newTab: "（新しいタブで開きます）",
    appRatingTitle: "アプリのスコアと分析",
    appRatingBody: "レビュースコア、評価されている点と不満点",
    nicheRatingTitle: "このテーマのアプリ評価",
    nicheRatingBody: "各アプリのレビュースコアとストア評価",
  },
});

export type RatingStrings = (typeof ratingStrings)["ru"];

/**
 * The keys the rating's client components read: the niche list (RatingNicheList: sort chips,
 * legend, list titles, the narrow rank label), the gallery and its viewer (RatingGallery) and the
 * catalogue's search rows (RatingSearchRow). Only these travel in the pages' RSC payload; the SEO
 * templates, the method and archive texts stay on the server.
 */
export const RATING_CLIENT_FIELDS = [
  "sortReview",
  "sortStore",
  "sortRatings",
  "sortName",
  "legend",
  "leadersTitle",
  "restTitle",
  "rankShort",
  "shotsTitle",
  "shotsLabel",
  "shotAlt",
  "prevShot",
  "nextShot",
  "viewerCount",
  "searchContext",
  "outOf100",
  "scoreA11y",
] as const satisfies readonly (keyof RatingStrings)[];

export type RatingClientStrings = Pick<RatingStrings, (typeof RATING_CLIENT_FIELDS)[number]>;

const clientRows = new Map<Locale, RatingClientStrings>();

/** The page locale's RATING_CLIENT_FIELDS row for <I18nProvider web={{ rating }}> (one object per locale). */
export function ratingClientStrings(locale: Locale): RatingClientStrings {
  let row = clientRows.get(locale);
  if (!row) {
    const all = ratingStrings[locale];
    row = Object.fromEntries(RATING_CLIENT_FIELDS.map((key) => [key, all[key]])) as RatingClientStrings;
    clientRows.set(locale, row);
  }
  return row;
}
