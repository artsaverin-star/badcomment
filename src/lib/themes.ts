export type Theme = {
  key: string;
  label: string;
  keywords: string[];
};

// Keyword-based complaint themes. Matched case-insensitively against review text.
// Covers EN + RU since stores return localized reviews.
export const THEMES: Theme[] = [
  {
    key: "crashes",
    label: "Crashes / freezes",
    keywords: ["crash", "crashes", "freeze", "frozen", "hang", "вылет", "вылета", "виснет", "зависает", "краш"],
  },
  {
    key: "bugs",
    label: "Bugs / broken",
    keywords: ["bug", "buggy", "broken", "doesn't work", "not working", "glitch", "баг", "не работает", "глюк", "сломал"],
  },
  {
    key: "ads",
    label: "Too many ads",
    keywords: ["ad", "ads", "advert", "advertising", "реклам", "рекламы"],
  },
  {
    key: "price",
    label: "Price / subscription",
    keywords: ["expensive", "overpriced", "subscription", "paywall", "scam", "refund", "дорог", "подписк", "деньги", "платн", "развод"],
  },
  {
    key: "login",
    label: "Login / account",
    keywords: ["login", "log in", "sign in", "password", "account", "verification", "вход", "войти", "пароль", "аккаунт", "регистрац"],
  },
  {
    key: "performance",
    label: "Slow / laggy",
    keywords: ["slow", "lag", "laggy", "loading", "battery", "медленн", "тормоз", "лаг", "грузит", "батаре"],
  },
  {
    key: "update",
    label: "Bad update",
    keywords: ["update", "new version", "latest version", "after update", "обновлен", "после обновления", "новая верси"],
  },
  {
    key: "ui",
    label: "Confusing UI",
    keywords: ["ui", "interface", "design", "confusing", "ugly", "hard to use", "интерфейс", "неудобн", "дизайн", "непонятн"],
  },
  {
    key: "support",
    label: "Bad support",
    keywords: ["support", "customer service", "no response", "ignored", "поддержк", "не отвеча", "техподдержк"],
  },
  {
    key: "notifications",
    label: "Spam notifications",
    keywords: ["notification", "spam", "push", "уведомлен", "спам", "пуш"],
  },
];

export function tagThemes(text: string): string[] {
  const lower = text.toLowerCase();
  const hits: string[] = [];
  for (const theme of THEMES) {
    if (theme.keywords.some((kw) => lower.includes(kw))) hits.push(theme.key);
  }
  return hits;
}

export const themeLabel = (key: string) =>
  THEMES.find((t) => t.key === key)?.label ?? key;
