// App UI keys (content/v2/<L>/ui.json, keyed by the Russian source) that the research
// feature's CLIENT components need. A plain module so server components can pass them to
// t.pick(...) for the page's <I18nProvider>.

import { LIBRARY_UI_KEYS } from "../library/keys";

/** Article toolbar, TOC sheet/rail, locked preview actions (+ BookmarkButton / NoteSheet). */
export const RESEARCH_ARTICLE_UI_KEYS = [
  "Назад",
  "Содержание",
  "Содержание разбора",
  "Готово",
  "Действия с разбором",
  "Заметка к разбору",
  "Открыть все материалы",
  "Моя заметка к материалу",
  ...LIBRARY_UI_KEYS,
] as const;
