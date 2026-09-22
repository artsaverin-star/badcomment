// Server-safe key lists of the settings feature (a "use client" module cannot export data to
// server components: its non-component exports become client references).

/** App UI keys the client parts translate (handed down with t.pick on the server). */
export const SETTINGS_CLIENT_KEYS = [
  "Все разборы\nи идеи",
  "Подробные исследования, идеи приложений и экспорт материалов.",
  "Открыть Plus",
  "О моём Plus",
  "Активен",
  "Проверяем доступ…",
  "Бессрочный доступ",
  "Доступ до %1$@",
  "Все разборы, идеи и экспорт",
  "Один платёж. Без продления.",
  "Восстановить покупки",
  "Восстанавливаем…",
  "Оформление",
  "Светлая",
  "Тёмная",
  "Системная",
] as const;
