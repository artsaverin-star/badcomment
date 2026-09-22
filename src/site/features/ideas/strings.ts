import { defineStrings } from "@/site/i18n/strings";

// Web-only strings of the ideas feature (ARCHITECTURE §6). Everything else comes from the
// app packs (content/v2/<L>/ui.json, see ./keys.ts). Voice: «ты» / du / tu / です・ます.
// Placeholders: {name} (fill with format()).

export const ideasStrings = defineStrings({
  ru: {
    // App Store promo (DECISIONS §12)
    promoEyebrow: "Приложение для iPhone",
    promoTitle: "Идеи и разборы — в кармане",
    promoBody: "Те же разборы и идеи в приложении inApp: закладки, заметки и готовые документы прямо в телефоне.",
    // Reader extras (site-only richness)
    categoryLabel: "Категория",
    quoteSource: "Отзыв о приложении {app}",
    quoteRating: "Оценка: {n} из 5",
    // Export sheet
    exportLoading: "Собираем документ…",
    exportForbidden: "Этот документ доступен в Plus.",
    catalogLabel: "Идеи приложений",
    categoryPickerOpen: "Выбрать категорию: {name}",
  },
  en: {
    promoEyebrow: "The iPhone app",
    promoTitle: "Ideas and breakdowns in your pocket",
    promoBody: "The same breakdowns and ideas in the inApp app: bookmarks, notes and ready documents right on your phone.",
    categoryLabel: "Category",
    quoteSource: "A review of {app}",
    quoteRating: "Rating: {n} out of 5",
    exportLoading: "Putting the document together…",
    exportForbidden: "This document is available in Plus.",
    catalogLabel: "App ideas",
    categoryPickerOpen: "Pick a category: {name}",
  },
  de: {
    promoEyebrow: "Die iPhone-App",
    promoTitle: "Ideen und Analysen für unterwegs",
    promoBody: "Dieselben Analysen und Ideen in der inApp-App: Lesezeichen, Notizen und fertige Dokumente direkt auf deinem Handy.",
    categoryLabel: "Kategorie",
    quoteSource: "Eine Rezension zu {app}",
    quoteRating: "Bewertung: {n} von 5",
    exportLoading: "Das Dokument wird zusammengestellt …",
    exportForbidden: "Dieses Dokument gibt es in Plus.",
    catalogLabel: "App-Ideen",
    categoryPickerOpen: "Kategorie wählen: {name}",
  },
  fr: {
    promoEyebrow: "L’app pour iPhone",
    promoTitle: "Idées et décryptages dans ta poche",
    promoBody: "Les mêmes décryptages et idées dans l’app inApp : signets, notes et documents prêts, directement sur ton téléphone.",
    categoryLabel: "Catégorie",
    quoteSource: "Un avis sur {app}",
    quoteRating: "Note : {n} sur 5",
    exportLoading: "Préparation du document…",
    exportForbidden: "Ce document est disponible dans Plus.",
    catalogLabel: "Idées d’apps",
    categoryPickerOpen: "Choisir une catégorie : {name}",
  },
  ja: {
    promoEyebrow: "iPhoneアプリ",
    promoTitle: "アイデアと分析をポケットに",
    promoBody: "同じ分析とアイデアをinAppアプリで。ブックマーク、メモ、完成した文書をスマートフォンで手元に置けます。",
    categoryLabel: "カテゴリー",
    quoteSource: "{app} へのレビュー",
    quoteRating: "評価：5点中{n}点",
    exportLoading: "文書を用意しています…",
    exportForbidden: "この文書はPlusで利用できます。",
    catalogLabel: "アプリのアイデア",
    categoryPickerOpen: "カテゴリーを選ぶ：{name}",
  },
});
