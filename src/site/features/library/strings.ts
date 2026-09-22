import { defineStrings } from "../../i18n/strings";

// Web-only strings of «Сохранённое», notes and sync (spec 09 G11: the app's device wording
// «на этом iPhone / устройстве» becomes browser / account wording, in the app's «ты» voice;
// de/fr informal, ja follows ui.ja.json). App UI strings come from content/v2/<L>/ui.json.

export const libraryStrings = defineStrings({
  ru: {
    savedInBrowser: "Сохранено в этом браузере. Войди, чтобы не потерять.",
    signIn: "Войти",
    savedInAccount: "Сохранено в твоём аккаунте",
    syncError: "Не удалось синхронизировать с аккаунтом. Изменения сохранены в этом браузере — попробуем ещё раз.",
    noteFootnoteBrowser: "Заметка хранится в этом браузере. Удаление материала из сохранённого не удаляет заметку.",
    noteFootnoteAccount: "Заметка хранится в твоём аккаунте. Удаление материала из сохранённого не удаляет заметку.",
    bookmarkRemoved: "Закладка убрана",
    filterLabel: "Фильтр",
    loading: "Загружаем сохранённое…",
    storageUnreadable: "Не удалось прочитать часть сохранённого в этом браузере. Исходные данные сохранены.",
  },
  en: {
    savedInBrowser: "Saved in this browser. Sign in so you don’t lose it.",
    signIn: "Sign in",
    savedInAccount: "Saved to your account",
    syncError: "Couldn’t sync with your account. Your changes are kept in this browser — we’ll try again.",
    noteFootnoteBrowser: "The note is kept in this browser. Removing the material from Saved does not delete the note.",
    noteFootnoteAccount: "The note is kept in your account. Removing the material from Saved does not delete the note.",
    bookmarkRemoved: "Bookmark removed",
    filterLabel: "Filter",
    loading: "Loading your saved items…",
    storageUnreadable: "Couldn’t read part of what you saved in this browser. The original data has been kept.",
  },
  de: {
    savedInBrowser: "In diesem Browser gespeichert. Melde dich an, damit nichts verloren geht.",
    signIn: "Anmelden",
    savedInAccount: "In deinem Konto gespeichert",
    syncError:
      "Die Synchronisierung mit deinem Konto hat nicht geklappt. Deine Änderungen bleiben in diesem Browser — wir versuchen es gleich noch einmal.",
    noteFootnoteBrowser:
      "Die Notiz bleibt in diesem Browser. Das Entfernen des Materials aus Gespeichert löscht die Notiz nicht.",
    noteFootnoteAccount:
      "Die Notiz bleibt in deinem Konto. Das Entfernen des Materials aus Gespeichert löscht die Notiz nicht.",
    bookmarkRemoved: "Lesezeichen entfernt",
    filterLabel: "Filter",
    loading: "Gespeichertes wird geladen…",
    storageUnreadable: "Ein Teil deiner gespeicherten Inhalte in diesem Browser ließ sich nicht lesen. Die ursprünglichen Daten bleiben erhalten.",
  },
  fr: {
    savedInBrowser: "Enregistré dans ce navigateur. Connecte-toi pour ne rien perdre.",
    signIn: "Se connecter",
    savedInAccount: "Enregistré dans ton compte",
    syncError:
      "Impossible de synchroniser avec ton compte. Tes modifications restent dans ce navigateur — on réessaie bientôt.",
    noteFootnoteBrowser:
      "La note reste dans ce navigateur. Retirer le contenu des Enregistrés ne supprime pas la note.",
    noteFootnoteAccount: "La note reste dans ton compte. Retirer le contenu des Enregistrés ne supprime pas la note.",
    bookmarkRemoved: "Signet retiré",
    filterLabel: "Filtre",
    loading: "Chargement de tes enregistrements…",
    storageUnreadable: "Impossible de lire une partie de tes enregistrements dans ce navigateur. Les données d’origine sont conservées.",
  },
  ja: {
    savedInBrowser: "このブラウザに保存されています。なくさないようにログインしましょう。",
    signIn: "ログイン",
    savedInAccount: "アカウントに保存されています",
    syncError: "アカウントと同期できませんでした。変更はこのブラウザに保存されています。あとでもう一度試します。",
    noteFootnoteBrowser: "メモはこのブラウザに保存されます。資料を保存済みから外してもメモは消えません。",
    noteFootnoteAccount: "メモはアカウントに保存されます。資料を保存済みから外してもメモは消えません。",
    bookmarkRemoved: "ブックマークを外しました",
    filterLabel: "フィルター",
    loading: "保存済みを読み込んでいます…",
    storageUnreadable: "このブラウザに保存した内容の一部を読み込めませんでした。元のデータは保持されています。",
  },
});
