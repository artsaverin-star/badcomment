// Appearance of the new site (spec 09 C9): cookie `ia_theme` = light (default) | dark | system.
// The root layout renders <html data-theme> from the cookie, so SSR has no flash; "system"
// follows prefers-color-scheme in CSS (src/site/styles/tokens.css). The new site never
// reads or writes the old site's `theme` cookie. Client-safe.

export const THEMES = ["light", "dark", "system"] as const;
export type Theme = (typeof THEMES)[number];
export const DEFAULT_THEME: Theme = "light";
export const THEME_COOKIE = "ia_theme";

export function toTheme(value: string | null | undefined): Theme {
  return value === "dark" || value === "system" ? value : DEFAULT_THEME;
}

/** <meta name="theme-color"> per theme (spec 09 G1): paper screens. */
export const THEME_COLOR = { light: "#F5F5F7", dark: "#111214" } as const;

/** Client: switch the theme immediately and remember it for a year. */
export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = theme;
  document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  const meta = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
  if (theme !== "system" && meta.length) {
    meta.forEach((m) => {
      m.content = THEME_COLOR[theme];
      m.removeAttribute("media");
    });
  }
}
