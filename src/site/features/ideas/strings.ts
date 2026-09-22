import { defineStrings } from "@/site/i18n/strings";

// Web-only strings of the ideas feature (ARCHITECTURE §6). Everything else comes from the
// app packs (content/v2/<L>/ui.json, see ./keys.ts). Voice: «ты» / du / tu / です・ます.
// Placeholders: {name} (fill with format()). fr: U+00A0 before « : ; ! ? » and after «, like
// the app's ui.fr.json. Search-engine copy (titles, descriptions) lives in ./seo.ts (server only).

export const ideasStrings = defineStrings({
  ru: {
    // App Store promo (DECISIONS §12)
    promoEyebrow: "Приложение для iPhone",
    promoTitle: "Идеи и разборы — в кармане",
    promoBody: "Те же разборы и идеи в приложении inApp: закладки, заметки и готовые документы прямо в телефоне.",
    // Export sheet
    exportLoading: "Собираем документ…",
    exportForbidden: "Этот документ доступен в Plus.",
    /** Legacy single-idea unlock without the category: the file carries only the topic summary. */
    exportSummaryOnly: "Полный разбор этой категории — в Plus. В файле будет его краткое описание, идея и заметка.",
    catalogLabel: "Идеи приложений",
    categoryPickerOpen: "Выбрать категорию: {name}",
  },
  en: {
    promoEyebrow: "The iPhone app",
    promoTitle: "Ideas and breakdowns in your pocket",
    promoBody: "The same breakdowns and ideas in the inApp app: bookmarks, notes and ready documents right on your phone.",
    exportLoading: "Putting the document together…",
    exportForbidden: "This document is available in Plus.",
    exportSummaryOnly: "The full breakdown of this category is in Plus. The file will have its short summary, the idea and your note.",
    catalogLabel: "App ideas",
    categoryPickerOpen: "Pick a category: {name}",
  },
  de: {
    promoEyebrow: "Die iPhone-App",
    promoTitle: "Ideen und Analysen für unterwegs",
    promoBody: "Dieselben Analysen und Ideen in der inApp-App: Lesezeichen, Notizen und fertige Dokumente direkt auf deinem Handy.",
    exportLoading: "Das Dokument wird zusammengestellt…",
    exportForbidden: "Dieses Dokument gibt es in Plus.",
    exportSummaryOnly: "Die vollständige Analyse dieser Kategorie gibt es in Plus. Die Datei enthält ihre Kurzbeschreibung, die Idee und deine Notiz.",
    catalogLabel: "App-Ideen",
    categoryPickerOpen: "Kategorie wählen: {name}",
  },
  fr: {
    promoEyebrow: "L’app pour iPhone",
    promoTitle: "Idées et décryptages dans ta poche",
    promoBody: "Les mêmes décryptages et idées dans l’app inApp : signets, notes et documents prêts, directement sur ton téléphone.",
    exportLoading: "Préparation du document…",
    exportForbidden: "Ce document est disponible dans Plus.",
    exportSummaryOnly: "Le décryptage complet de cette catégorie est dans Plus. Le fichier contiendra son résumé, l’idée et ta note.",
    catalogLabel: "Idées d’apps",
    categoryPickerOpen: "Choisir une catégorie : {name}",
  },
  ja: {
    promoEyebrow: "iPhoneアプリ",
    promoTitle: "アイデアと分析をポケットに",
    promoBody: "同じ分析とアイデアをinAppアプリで。ブックマーク、メモ、完成した文書をスマートフォンで手元に置けます。",
    exportLoading: "文書を用意しています…",
    exportForbidden: "この文書はPlusで利用できます。",
    exportSummaryOnly: "このカテゴリーの完全な分析はPlusで読めます。ファイルには分析の概要、アイデア、メモが入ります。",
    catalogLabel: "アプリのアイデア",
    categoryPickerOpen: "カテゴリーを選ぶ：{name}",
  },
});
