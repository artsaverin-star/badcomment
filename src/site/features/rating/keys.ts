// App UI keys (content/v2/<L>/ui.json) that the rating CLIENT components render; server pages
// hand them down with t.pick(RATING_UI_KEYS) (the shell already provides «Назад», «Очистить
// поиск», «Ещё»). The review archive has its own list (features/reviews/keys.ts).

/**
 * Everything the rating's client components say through t() (spec 11 §7.2): the catalogue
 * search (RatingCatalog), the niche list (RatingNicheList: search, sort chips, legend link, empty
 * card) and the screenshot viewer (RatingGallery). The method section, tasks, rows and facts are
 * server-rendered; web-only words come from strings.ts through useWeb("rating"). Every rating
 * page that mounts a client part wraps it in
 * <I18nProvider locale strings={t.pick(RATING_UI_KEYS)} web={{ rating: ratingClientStrings(L) }}>.
 */
export const RATING_UI_KEYS = [
  // Catalogue search (ClarityRatings.swift:82, 110-121)
  "Приложение или задача",
  "Очистить поиск",
  "Найдено приложений: %1$@",
  "Пока не нашли",
  "Попробуй название приложения или тему: например, календарь, фото или привычки.",
  "Показать остальные %1$@",
  "Не удалось открыть каталог",
  "Повторить",
  // Niche list (:170-218)
  "Найти в этой теме",
  "Приложения",
  "Сортировка",
  "Нет подходящих результатов",
  "Попробуй другое название или очисти поиск.",
  "Об оценках",
  // Screenshot viewer (RatingGallery)
  "Закрыть",
] as const;
