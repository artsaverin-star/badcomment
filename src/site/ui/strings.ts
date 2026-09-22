import { defineStrings } from "../i18n/strings";

// Web-only strings of the UI primitives (App Store badge + review dialog, DECISIONS §13).
// ru/en written here; de/fr/ja in the app's voice (du / tu / です・ます).

export const uiStrings = defineStrings({
  ru: {
    appStoreBadge: "Загрузите в App Store",
    appStoreDialogTitle: "inApp для iPhone",
    appStoreDialogBody:
      "Приложение проходит проверку Apple и скоро появится в App Store. Пока можно пользоваться веб-версией.",
    appStoreDialogContinue: "Продолжить на сайте",
    appStoreSoon: "Скоро в App Store",
  },
  en: {
    appStoreBadge: "Download on the App Store",
    appStoreDialogTitle: "inApp for iPhone",
    appStoreDialogBody:
      "The app is being reviewed by Apple and will be on the App Store soon. In the meantime, you can use the web version.",
    appStoreDialogContinue: "Continue on the website",
    appStoreSoon: "Coming soon to the App Store",
  },
  de: {
    appStoreBadge: "Laden im App Store",
    appStoreDialogTitle: "inApp für das iPhone",
    appStoreDialogBody:
      "Die App wird gerade von Apple geprüft und ist bald im App Store erhältlich. Bis dahin kannst du die Web-Version nutzen.",
    appStoreDialogContinue: "Auf der Website weiter",
    appStoreSoon: "Bald im App Store",
  },
  fr: {
    appStoreBadge: "Télécharger dans l’App Store",
    appStoreDialogTitle: "inApp pour iPhone",
    appStoreDialogBody:
      "L’app est en cours de validation par Apple et sera bientôt disponible sur l’App Store. En attendant, tu peux utiliser la version web.",
    appStoreDialogContinue: "Continuer sur le site",
    appStoreSoon: "Bientôt sur l’App Store",
  },
  ja: {
    appStoreBadge: "App Storeからダウンロード",
    appStoreDialogTitle: "iPhone版 inApp",
    appStoreDialogBody:
      "アプリは現在Appleの審査中で、まもなくApp Storeで公開されます。それまではWeb版をご利用ください。",
    appStoreDialogContinue: "Webで続ける",
    appStoreSoon: "App Storeで近日公開",
  },
});
