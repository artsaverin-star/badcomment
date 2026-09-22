import { defineStrings } from "@/site/i18n/strings";

// Web-only strings of Settings and «О материалах» (spec 02 §8, web deltas spec 09 G11).
// App strings («Язык», «Оформление», «Открыть Plus», …) come from the app packs through t().

export const settingsStrings = defineStrings({
  ru: {
    description: "Plus, аккаунт, язык и оформление inApp.",
    account: "Аккаунт",
    signInRestore: "Войти, чтобы восстановить доступ",
    signOut: "Выйти",
    signOutFailed: "Не получилось выйти. Попробуй ещё раз.",
    restoreActive: "Plus активен в этом аккаунте.",
    restoreNone: "В этом аккаунте покупок не нашлось.",
    restoreFailed: "Не удалось проверить доступ. Попробуй ещё раз.",
    iphoneApp: "Приложение для iPhone",
    paymentOffer: "Оферта",
    storedBrowser: "Закладки и заметки хранятся в этом браузере.",
    storedAccount: "Закладки и заметки хранятся в твоём аккаунте.",
    recordsBrowser:
      "Закладки и заметки хранятся в этом браузере. Удаление закладки не удаляет заметку. Синхронизации между устройствами нет.",
    recordsAccount:
      "Закладки и заметки хранятся в твоём аккаунте и доступны после входа на любом устройстве. Удаление закладки не удаляет заметку.",
    aboutDescription: "Из чего составлены разборы и идеи inApp, что доступно бесплатно и где хранятся твои записи.",
  },
  en: {
    description: "Plus, account, language and appearance of inApp.",
    account: "Account",
    signInRestore: "Sign in to restore access",
    signOut: "Sign out",
    signOutFailed: "Couldn’t sign out. Try again.",
    restoreActive: "Plus is active in this account.",
    restoreNone: "No purchases found in this account.",
    restoreFailed: "Couldn’t check your access. Try again.",
    iphoneApp: "The iPhone app",
    paymentOffer: "Public offer",
    storedBrowser: "Bookmarks and notes are kept in this browser.",
    storedAccount: "Bookmarks and notes are kept in your account.",
    recordsBrowser:
      "Bookmarks and notes are kept in this browser. Removing a bookmark does not delete the note. There is no syncing between devices.",
    recordsAccount:
      "Bookmarks and notes are kept in your account and are available on any device once you sign in. Removing a bookmark does not delete the note.",
    aboutDescription: "What inApp’s breakdowns and ideas are built from, what is free and where your records are kept.",
  },
  de: {
    description: "Plus, Konto, Sprache und Darstellung von inApp.",
    account: "Konto",
    signInRestore: "Anmelden, um den Zugang wiederherzustellen",
    signOut: "Abmelden",
    signOutFailed: "Abmelden hat nicht geklappt. Versuch es noch einmal.",
    restoreActive: "Plus ist in diesem Konto aktiv.",
    restoreNone: "In diesem Konto wurden keine Käufe gefunden.",
    restoreFailed: "Dein Zugang ließ sich nicht prüfen. Versuch es noch einmal.",
    iphoneApp: "Die iPhone-App",
    paymentOffer: "Öffentliches Angebot",
    storedBrowser: "Lesezeichen und Notizen bleiben in diesem Browser.",
    storedAccount: "Lesezeichen und Notizen liegen in deinem Konto.",
    recordsBrowser:
      "Lesezeichen und Notizen bleiben in diesem Browser. Ein entferntes Lesezeichen löscht die Notiz nicht. Zwischen Geräten wird nichts synchronisiert.",
    recordsAccount:
      "Lesezeichen und Notizen liegen in deinem Konto und sind nach der Anmeldung auf jedem Gerät verfügbar. Ein entferntes Lesezeichen löscht die Notiz nicht.",
    aboutDescription: "Woraus die Analysen und Ideen von inApp bestehen, was kostenlos ist und wo deine Einträge liegen.",
  },
  fr: {
    description: "Plus, compte, langue et apparence d’inApp.",
    account: "Compte",
    signInRestore: "Se connecter pour restaurer l’accès",
    signOut: "Se déconnecter",
    signOutFailed: "Impossible de se déconnecter. Réessaie.",
    restoreActive: "Plus est actif sur ce compte.",
    restoreNone: "Aucun achat trouvé sur ce compte.",
    restoreFailed: "Impossible de vérifier ton accès. Réessaie.",
    iphoneApp: "L’app pour iPhone",
    paymentOffer: "Offre publique",
    storedBrowser: "Les signets et les notes restent dans ce navigateur.",
    storedAccount: "Les signets et les notes sont dans ton compte.",
    recordsBrowser:
      "Les signets et les notes restent dans ce navigateur. Retirer un signet ne supprime pas la note. Il n’y a pas de synchronisation entre appareils.",
    recordsAccount:
      "Les signets et les notes sont dans ton compte et disponibles sur n’importe quel appareil une fois connecté. Retirer un signet ne supprime pas la note.",
    aboutDescription: "De quoi sont faits les décryptages et les idées d’inApp, ce qui est gratuit et où sont gardés tes enregistrements.",
  },
  ja: {
    description: "inAppのPlus、アカウント、言語、外観。",
    account: "アカウント",
    signInRestore: "ログインしてアクセスを復元",
    signOut: "ログアウト",
    signOutFailed: "ログアウトできませんでした。もう一度お試しください。",
    restoreActive: "このアカウントでPlusが有効です。",
    restoreNone: "このアカウントでは購入が見つかりませんでした。",
    restoreFailed: "アクセスを確認できませんでした。もう一度お試しください。",
    iphoneApp: "iPhoneアプリ",
    paymentOffer: "ウェブ決済の規約",
    storedBrowser: "ブックマークとメモはこのブラウザに保存されます。",
    storedAccount: "ブックマークとメモはあなたのアカウントに保存されます。",
    recordsBrowser:
      "ブックマークとメモはこのブラウザに保存されます。ブックマークを外してもメモは消えません。端末間の同期はありません。",
    recordsAccount:
      "ブックマークとメモはあなたのアカウントに保存され、ログインすればどの端末でも使えます。ブックマークを外してもメモは消えません。",
    aboutDescription: "inAppの分析とアイデアが何からできているか、何が無料か、あなたの記録がどこに保存されるか。",
  },
});
