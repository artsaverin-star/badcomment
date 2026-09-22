// App UI keys (content/v2/<L>/ui.json, keyed by the Russian source) of the library feature.
// A plain module on purpose: server components can import these arrays and call
// t.pick(...) — an array imported from a "use client" file is only a client reference there.
//
//   import { LIBRARY_UI_KEYS } from "@/site/features/library/keys";
//   <I18nProvider locale={L} strings={t.pick([...MY_KEYS, ...LIBRARY_UI_KEYS])}>

/** Keys used by <BookmarkButton> and <NoteSheet> (also re-exported by ./components). */
export const LIBRARY_UI_KEYS = [
  // BookmarkButton
  "Сохранить",
  "Убрать из сохранённого",
  "Закладка сохранена",
  // NoteSheet
  "Моя заметка",
  "Отмена",
  "Что хочется запомнить или проверить?",
  "Не удалось сохранить изменения. Текст остаётся на экране — попробуй ещё раз.",
  "Не сохранять изменения?",
  "Не сохранять",
  "Продолжить редактирование",
] as const;

/** Keys of the «Сохранённое» screen (spec 02 §6), including the components it renders. */
export const SAVED_UI_KEYS = [
  "Сохранённое",
  "Твоя библиотека",
  "Материалы и личные заметки",
  "Настройки",
  "Пока нет сохранённого",
  "Нажми закладку в разборе или идее — материал появится здесь. Заметки к нему тоже.",
  "Открыть разборы",
  "Найти в сохранённом",
  "Очистить поиск",
  "Всё",
  "Разборы",
  "Идеи",
  "Заметки",
  "Здесь пока пусто",
  "Сохрани материал этого раздела или посмотри всю библиотеку.",
  "Заметки к материалам появятся здесь, даже если убрать закладку.",
  "Показать всё",
  "Ничего не найдено",
  "Попробуй другое название или слово из заметки.",
  "Сбросить поиск",
  "Разбор",
  "Идея",
  "Идея в Plus",
  "Идея недоступна",
  "Разбор недоступен",
  "Действия: %1$@",
  "Добавить заметку",
  "Редактировать заметку",
  "%1$@. Есть твоя заметка. %2$@",
  ...LIBRARY_UI_KEYS,
] as const;
