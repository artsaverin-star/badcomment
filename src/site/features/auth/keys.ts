// Server-safe key list of the sign-in feature (the dialog host and /<L>/login hand these
// down with t.pick; the panel renders nothing else from the app packs).

/** App UI keys (content/v2/<L>/ui.json) the sign-in dialog and panel render on the client. */
export const AUTH_UI_KEYS = ["Закрыть", "Отмена", "Условия использования", "Конфиденциальность"] as const;
