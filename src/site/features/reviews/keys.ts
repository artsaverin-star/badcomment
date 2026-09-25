// App UI keys (content/v2/<L>/ui.json) the review archive's CLIENT components render
// (ReviewNiches, ReviewApps, ReviewBrowser and the PickerSheet it opens); the pages hand them
// down with t.pick(REVIEWS_UI_KEYS). «Готово» and «Очистить поиск» also come with the shell
// (SHELL_UI_KEYS); they are listed so this array alone covers the components.
// Redesign spec §7.1 «Reviews».

export const REVIEWS_UI_KEYS = [
  // ReviewNiches (/<L>/reviews)
  "Найти категорию",
  "Найдено: %1$@",
  "Выбери тему",
  "Пока ничего не нашлось",
  "Попробуй название категории или более короткий запрос.",
  // ReviewApps (/<L>/reviews/<niche>): app names and topics are searched, not categories
  "Приложения",
  "Попробуй другое название или очисти поиск.",
  // ReviewBrowser (/<L>/reviews/<niche>/<app id>): the sort menu, the topic picker sheet
  "Порядок",
  "Сортировка",
  "Готово",
  "Очистить поиск",
] as const;
