import { cookies } from "next/headers";

export type Locale = "en" | "ru";
export const LOCALES: Locale[] = ["en", "ru"];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "locale";

export async function getLocale(): Promise<Locale> {
  const v = (await cookies()).get(LOCALE_COOKIE)?.value;
  return v === "ru" ? "ru" : "en";
}

type Dict = {
  nav: {
    home: string;
    allDirections: string;
    back: string;
    seeAllReviews: string;
  };
  home: {
    tagline: string;
    ideaDeckCta: string;
    ideaDeckDesc: string;
    browseByDirection: string;
    notCrawled: string;
    topThemes: string;
    appsComplaints: (apps: number, complaints: number) => string;
  };
  search: {
    placeholder: string;
    search: string;
    searching: string;
    analyze: string;
    analyzing: string;
    searchFailed: string;
    analyzeFailed: string;
  };
  themes: { empty: string };
  ideas: { title: string; desc: string; empty: string; all: string };
  card: {
    toRebuild: string;
    complaints: (n: number) => string;
    ratingSpread: string;
    love: string;
    provenDemand: (label: string) => string;
    improve: string;
    howHard: string;
    howToBeat: string;
    opportunity: string;
    gaps: string;
    monetization: string;
    cantClone: string;
  };
  category: {
    subtitle: string;
    empty: string;
    complaints: (n: number) => string;
  };
  product: {
    negativeReviews: (n: number) => string;
    themesBoth: string;
    storeReviews: (store: string, n: number) => string;
    negativeHeading: string;
    anon: string;
  };
  categoryLabels: Record<string, string>;
  themeLabels: Record<string, string>;
  lovedLabels: Record<string, string>;
  opportunityTypeLabels: Record<string, string>;
};

const DICT: Record<Locale, Dict> = {
  en: {
    nav: {
      home: "← Home",
      allDirections: "← All directions",
      back: "← Back",
      seeAllReviews: "See all reviews →",
    },
    home: {
      tagline:
        "What people hate about popular apps — negative reviews from Google Play and the App Store, merged and themed. Find the gaps worth building.",
      ideaDeckCta: "Browse the idea deck →",
      ideaDeckDesc:
        "App ideas worth building: proven apps with obvious gaps, pros & cons pulled from real reviews.",
      browseByDirection: "Browse by direction",
      notCrawled: "Not crawled yet",
      topThemes: "Top complaint themes (all apps)",
      appsComplaints: (apps, complaints) => `${apps} apps · ${complaints} complaints`,
    },
    search: {
      placeholder: "Search an app by name, e.g. Spotify",
      search: "Search",
      searching: "Searching…",
      analyze: "Analyze",
      analyzing: "Analyzing…",
      searchFailed: "Search failed",
      analyzeFailed: "Analyze failed",
    },
    themes: { empty: "No complaint themes detected yet." },
    ideas: {
      title: "Idea deck",
      desc: "Proven apps that still have obvious gaps, sorted by demand vs. how much there is to fix. Each card shows what users love and what to improve.",
      empty: "No ideas yet — run the ingest to collect reviews first.",
      all: "All",
    },
    card: {
      toRebuild: "to rebuild",
      complaints: (n) => `${n} complaints`,
      ratingSpread: "Rating spread",
      love: "What people love",
      provenDemand: (label) => `Proven demand — ${label}. An engaged user base already exists.`,
      improve: "What to improve",
      howHard: "How hard to rebuild",
      howToBeat: "How to beat them",
      opportunity: "The opening",
      gaps: "Specific gaps to close",
      monetization: "Monetization pain",
      cantClone: "Hard to rebuild solo",
    },
    category: {
      subtitle: "Top apps in this direction and what users complain about.",
      empty: "Nothing crawled here yet. Run the category ingest to populate it.",
      complaints: (n) => `${n} complaints`,
    },
    product: {
      negativeReviews: (n) => `${n} negative reviews`,
      themesBoth: "Complaint themes (both stores)",
      storeReviews: (store, n) => `${store} · ${n} reviews`,
      negativeHeading: "Negative reviews",
      anon: "anon",
    },
    categoryLabels: {
      social: "Social",
      productivity: "Productivity",
      finance: "Finance",
      health: "Health & Fitness",
      photo: "Photo & Video",
      entertainment: "Entertainment",
      education: "Education",
      travel: "Travel",
      food: "Food & Drink",
      lifestyle: "Lifestyle",
      business: "Business",
      utilities: "Utilities",
    },
    themeLabels: {
      crashes: "Crashes / freezes",
      bugs: "Bugs / broken",
      ads: "Too many ads",
      price: "Price / subscription",
      login: "Login / account",
      performance: "Slow / laggy",
      update: "Bad update",
      ui: "Confusing UI",
      support: "Bad support",
      notifications: "Spam notifications",
    },
    lovedLabels: {
      easy: "Easy to use",
      design: "Nice design",
      fast: "Fast & smooth",
      value: "Good value",
      features: "Powerful features",
      reliable: "Reliable",
      support: "Great support",
    },
    opportunityTypeLabels: {
      design: "Design",
      features: "Features",
      reliability: "Reliability",
      pricing: "Pricing",
      content: "Content",
      support: "Support",
    },
  },
  ru: {
    nav: {
      home: "← На главную",
      allDirections: "← Все направления",
      back: "← Назад",
      seeAllReviews: "Все отзывы →",
    },
    home: {
      tagline:
        "За что люди не любят популярные приложения — негативные отзывы из Google Play и App Store, объединённые и разложенные по темам. Находите ниши, которые стоит занять.",
      ideaDeckCta: "Открыть колоду идей →",
      ideaDeckDesc:
        "Идеи приложений, которые стоит делать: проверенные продукты с очевидными пробелами, плюсы и минусы из реальных отзывов.",
      browseByDirection: "По направлениям",
      notCrawled: "Ещё не собрано",
      topThemes: "Главные темы жалоб (все приложения)",
      appsComplaints: (apps, complaints) => `${apps} прил. · ${complaints} жалоб`,
    },
    search: {
      placeholder: "Найдите приложение по названию, например Spotify",
      search: "Найти",
      searching: "Ищем…",
      analyze: "Анализ",
      analyzing: "Анализируем…",
      searchFailed: "Поиск не удался",
      analyzeFailed: "Анализ не удался",
    },
    themes: { empty: "Темы жалоб пока не найдены." },
    ideas: {
      title: "Колода идей",
      desc: "Проверенные приложения, у которых всё ещё есть явные пробелы. Отсортированы по спросу и тому, сколько в них можно улучшить. На каждой карточке — что нравится пользователям и что стоит исправить.",
      empty: "Идей пока нет — сначала запустите сбор отзывов.",
      all: "Все",
    },
    card: {
      toRebuild: "повторить",
      complaints: (n) => `${n} жалоб`,
      ratingSpread: "Распределение оценок",
      love: "Что нравится",
      provenDemand: (label) => `Проверенный спрос — ${label}. Активная аудитория уже есть.`,
      improve: "Что улучшить",
      howHard: "Насколько сложно повторить",
      howToBeat: "Как обойти оригинал",
      opportunity: "В чём возможность",
      gaps: "Конкретные пробелы",
      monetization: "Боль монетизации",
      cantClone: "В одиночку не повторить",
    },
    category: {
      subtitle: "Топовые приложения этого направления и на что жалуются пользователи.",
      empty: "Здесь пока ничего не собрано. Запустите сбор по категории.",
      complaints: (n) => `${n} жалоб`,
    },
    product: {
      negativeReviews: (n) => `${n} негативных отзывов`,
      themesBoth: "Темы жалоб (оба стора)",
      storeReviews: (store, n) => `${store} · ${n} отзывов`,
      negativeHeading: "Негативные отзывы",
      anon: "аноним",
    },
    categoryLabels: {
      social: "Соцсети",
      productivity: "Продуктивность",
      finance: "Финансы",
      health: "Здоровье и фитнес",
      photo: "Фото и видео",
      entertainment: "Развлечения",
      education: "Образование",
      travel: "Путешествия",
      food: "Еда и напитки",
      lifestyle: "Образ жизни",
      business: "Бизнес",
      utilities: "Утилиты",
    },
    themeLabels: {
      crashes: "Вылеты / зависания",
      bugs: "Баги / не работает",
      ads: "Слишком много рекламы",
      price: "Цена / подписка",
      login: "Вход / аккаунт",
      performance: "Тормозит / медленно",
      update: "Неудачное обновление",
      ui: "Запутанный интерфейс",
      support: "Плохая поддержка",
      notifications: "Спам-уведомления",
    },
    lovedLabels: {
      easy: "Удобно",
      design: "Приятный дизайн",
      fast: "Быстро и плавно",
      value: "Выгодно",
      features: "Мощные функции",
      reliable: "Надёжно",
      support: "Отличная поддержка",
    },
    opportunityTypeLabels: {
      design: "Дизайн",
      features: "Функции",
      reliability: "Надёжность",
      pricing: "Цена",
      content: "Контент",
      support: "Поддержка",
    },
  },
};

export function t(locale: Locale): Dict {
  return DICT[locale];
}

export const categoryLabelL = (locale: Locale, key: string) =>
  DICT[locale].categoryLabels[key] ?? key;
export const themeLabelL = (locale: Locale, key: string) =>
  DICT[locale].themeLabels[key] ?? key;
export const lovedLabelL = (locale: Locale, key: string) =>
  DICT[locale].lovedLabels[key] ?? key;
export const opportunityTypeLabelL = (locale: Locale, key: string) =>
  DICT[locale].opportunityTypeLabels[key] ?? key;
