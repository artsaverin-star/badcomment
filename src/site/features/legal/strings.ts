import { defineStrings } from "@/site/i18n/strings";

// Web-only strings of the legal pages: metadata, the payment-offer language note and the
// website privacy notice (spec 09 C3/G4/O6). The documents themselves live in terms.tsx,
// support.tsx, payment.tsx and privacy.tsx. Voice: «ты» / du / tu / です・ます.

export const legalStrings = defineStrings({
  ru: {
    supportTitle: "Поддержка",
    termsDescription:
      "Условия использования iOS-приложения inApp и сайта inapp.pro: подписка inApp Plus, возвраты, конфиденциальность и контакты.",
    supportDescription:
      "Как связаться с разработчиком inApp, восстановить покупку, управлять подпиской и запросить возврат.",
    paymentTitle: "Публичная оферта",
    paymentDescription:
      "Публичная оферта для оплаты доступа к материалам на сайте inapp.pro: предмет, порядок оплаты и предоставления доступа, возврат, реквизиты.",
    paymentNote: "",
    privacyTitle: "Конфиденциальность",
    privacyDescription:
      "Какие данные обрабатывает сайт inapp.pro: вход и аккаунт, закладки и заметки, оплата, аналитика, cookies — и как их удалить.",
  },
  en: {
    supportTitle: "Support",
    termsDescription:
      "Terms of Use for the inApp iOS app and inapp.pro: the inApp Plus subscription, refunds, privacy and contact.",
    supportDescription:
      "How to contact the inApp developer, restore a purchase, manage your subscription and request a refund.",
    paymentTitle: "Public offer",
    paymentDescription:
      "The public offer for paid access on the inapp.pro website (a Russian-language document).",
    paymentNote: "Public offer for purchases on the inapp.pro website (Russian-language document).",
    privacyTitle: "Privacy",
    privacyDescription:
      "What data the inapp.pro website processes: sign-in and account, bookmarks and notes, payments, analytics, cookies — and how to delete it.",
  },
  de: {
    supportTitle: "Support",
    termsDescription:
      "Nutzungsbedingungen für die iOS-App inApp und inapp.pro: das inApp-Plus-Abo, Erstattungen, Datenschutz und Kontakt.",
    supportDescription:
      "So erreichst du den Entwickler von inApp, stellst einen Kauf wieder her, verwaltest dein Abo und beantragst eine Erstattung.",
    paymentTitle: "Öffentliches Angebot",
    paymentDescription:
      "Das öffentliche Angebot für kostenpflichtigen Zugang auf der Website inapp.pro (Dokument auf Russisch).",
    paymentNote: "Öffentliches Angebot für Käufe auf der Website inapp.pro (Dokument auf Russisch).",
    privacyTitle: "Datenschutz",
    privacyDescription:
      "Welche Daten die Website inapp.pro verarbeitet: Anmeldung und Konto, Lesezeichen und Notizen, Zahlungen, Analyse, Cookies — und wie du sie löschst.",
  },
  fr: {
    supportTitle: "Assistance",
    termsDescription:
      "Conditions d’utilisation de l’app iOS inApp et du site inapp.pro : l’abonnement inApp Plus, les remboursements, la confidentialité et le contact.",
    supportDescription:
      "Comment contacter le développeur d’inApp, restaurer un achat, gérer ton abonnement et demander un remboursement.",
    paymentTitle: "Offre publique",
    paymentDescription: "L’offre publique pour l’accès payant sur le site inapp.pro (document en russe).",
    paymentNote: "Offre publique pour les achats sur le site inapp.pro (document en russe).",
    privacyTitle: "Confidentialité",
    privacyDescription:
      "Quelles données le site inapp.pro traite : connexion et compte, signets et notes, paiements, statistiques, cookies — et comment les supprimer.",
  },
  ja: {
    supportTitle: "サポート",
    termsDescription:
      "iOSアプリ「inApp」とinapp.proの利用規約：inApp Plusのサブスクリプション、返金、プライバシー、お問い合わせ。",
    supportDescription: "inAppの開発者への連絡方法、購入の復元、サブスクリプションの管理、返金の申請について。",
    paymentTitle: "ウェブ決済の規約",
    paymentDescription: "ウェブサイトinapp.proの有料アクセスに関するウェブ決済の規約（ロシア語の文書）。",
    paymentNote: "inapp.proのウェブサイトでの購入に関するウェブ決済の規約です（ロシア語の文書）。",
    privacyTitle: "プライバシー",
    privacyDescription:
      "ウェブサイトinapp.proが扱うデータ：ログインとアカウント、ブックマークとメモ、支払い、アナリティクス、Cookie、そして削除の方法。",
  },
});
