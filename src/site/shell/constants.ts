// Server-readable shell constants (kept out of "use client" modules so server components
// get the real values, not client references).

/** Cookie remembering that the mobile "open in app" banner was dismissed. */
export const APP_BANNER_COOKIE = "ia_app_banner";
export const APP_BANNER_DISMISS_DAYS = 180;
