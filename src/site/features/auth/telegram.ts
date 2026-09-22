// The pending Telegram login (client-only helpers). It survives reloads in localStorage under
// `inapp_tg_login`, the key the old site uses too, so the dialog can resume polling after the
// user comes back. Kept out of SignInPanel so the global host can check it without loading
// the panel's code.

export const TG_TTL_MS = 10 * 60 * 1000;

const TG_KEY = "inapp_tg_login";

export type TgState = { token: string; url: string; expiresAt: number; waiting: boolean };

/** A stored, unexpired Telegram login (waiting or not). */
export function loadPendingTelegram(): TgState | null {
  try {
    const raw = window.localStorage.getItem(TG_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as TgState;
    if (!s || typeof s.token !== "string" || typeof s.expiresAt !== "number" || s.expiresAt < Date.now()) {
      window.localStorage.removeItem(TG_KEY);
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

export function storeTelegram(s: TgState | null): void {
  try {
    if (s) window.localStorage.setItem(TG_KEY, JSON.stringify(s));
    else window.localStorage.removeItem(TG_KEY);
  } catch {
    /* storage denied: polling still works for this tab */
  }
}
