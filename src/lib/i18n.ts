// Pure, client-safe i18n. The cookie-reading getLocale() lives in i18n.server.ts
// so this module can be imported from client components (feed/detail) without
// pulling in next/headers.
export type Locale = "en" | "ru";
export const LOCALES: Locale[] = ["en", "ru"];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "locale";

type Dict = {
  nav: {
    home: string;
    allDirections: string;
    back: string;
    seeAllReviews: string;
    more: string;
    collapse: string;
    signIn: string;
    ideas: string;
    market: string;
    market2: string;
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
  market: {
    title: string;
    desc: string;
    pricing: string;
    audience: string;
    problems: string;
    apps: (n: number) => string;
    viewApps: string;
    backToMarket: string;
  };
  marketDash: {
    title: string;
    subtitle: string;
    // summary band
    apps: string;
    genres: string;
    installBase: string;
    ratings: string;
    // sorting
    sortBy: string;
    sortScale: string;
    sortGap: string;
    sortOpen: string;
    sortBuild: string;
    // the five launch questions (card strip)
    qMarket: string;
    qCompetition: string;
    qGap: string;
    qBuild: string;
    qMoney: string;
    // value labels
    players: (n: number) => string;
    leaderPct: (pct: number) => string;
    leader: string;
    mInstalls: (v: string) => string;
    mRatings: (v: string) => string;
    dataFresh: (date: string, reviews: string) => string;
    concFragmented: string;
    concSome: string;
    concCrowded: string;
    buildOf5: (v: string) => string;
    perMonth: string;
    noData: string;
    tiers: { niche: string; small: string; mid: string; large: string; giant: string };
    // nested detail sections
    details: string;
    whatHated: string;
    howToWin: string;
    appsInGenre: (n: number) => string;
  };
  market2: {
    title: string;
    subtitle: string;
    pilotNote: (genre: string) => string;
    gapsHeading: string;
    demand: string;
    verdictOpen: string;
    verdictNarrow: string;
    verdictThin: string;
    painIn: (x: number, y: number) => string;
    complaintsLabel: (n: number) => string;
    appsBreakdown: string;
    scanned: (n: number) => string;
    seeReviews: (n: number) => string;
    evidenceTitle: (label: string) => string;
    evidenceShownOf: (shown: number, total: number) => string;
    evidenceMethodNote: string;
    close: string;
  };
  deck: { prev: string; next: string };
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
    dislikes: string;
    installs: (formatted: string) => string;
    monetization: string;
    cantClone: string;
    buildScore: string;
    profitScore: string;
    buildHint: string;
    profitHint: string;
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
    // proof-first detail page
    realComplaints: (n: number) => string;
    ratingDist: string;
    complaintPattern: string;
    buildTitle: string;
    showingOf: (shown: number, total: number) => string;
    reviewSpan: (from: string, to: string) => string;
    ratingsScale: (count: string) => string;
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
      more: "Details",
      collapse: "Collapse",
      signIn: "Sign in",
      ideas: "Ideas",
      market: "Market",
      market2: "Market 2",
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
      title: "App ideas",
      desc: "We analyzed popular apps and real user reviews on the App Store and Google Play, and found fixable flaws in proven products you can address to take part of their audience. Building on demand that's already proven beats guessing.",
      empty: "No ideas yet — run the ingest to collect reviews first.",
      all: "All",
    },
    market: {
      title: "Market map",
      desc: "Apps grouped into market genres — with the pricing, audience and shared problems of each. Pick a genre to see the specific apps behind it.",
      pricing: "Pricing",
      audience: "Audience",
      problems: "Shared problems",
      apps: (n) => `${n} ${n === 1 ? "app" : "apps"}`,
      viewApps: "View the apps →",
      backToMarket: "← Back to the market map",
    },
    marketDash: {
      title: "Pick a market to build in",
      subtitle: "Each genre as a launch brief: is the demand proven, is it taken, where's the opening, how hard to build, and how they make money — go deeper on any one.",
      apps: "apps tracked",
      genres: "genres",
      installBase: "est. install base",
      ratings: "ratings mined",
      sortBy: "Sort by",
      sortScale: "Market size",
      sortGap: "Dissatisfaction",
      sortOpen: "Least crowded",
      sortBuild: "Easiest to build",
      qMarket: "Is there a market?",
      qCompetition: "Taken?",
      qGap: "Where's the opening?",
      qBuild: "Hard to build?",
      qMoney: "How they earn",
      players: (n) => `${n} ${n === 1 ? "player" : "players"}`,
      leaderPct: (pct) => `leader ${pct}%`,
      leader: "leader",
      mInstalls: (v) => `${v}+ installs`,
      mRatings: (v) => `${v} ratings`,
      dataFresh: (date, reviews) => `Reviews through ${date} · ${reviews} analyzed`,
      concFragmented: "fragmented — room to enter",
      concSome: "a few leaders",
      concCrowded: "dominated",
      buildOf5: (v) => `${v}/5`,
      perMonth: "/mo",
      noData: "—",
      tiers: { niche: "Niche", small: "Small", mid: "Mid", large: "Large", giant: "Giant" },
      details: "Details",
      whatHated: "What users hate",
      howToWin: "How to win",
      appsInGenre: (n) => `Apps (${n})`,
    },
    market2: {
      title: "What the market doesn't close",
      subtitle: "The jobs people hire these apps for — ranked by where every app still fails.",
      pilotNote: (genre) => `Pilot on one genre (${genre}). Scored live from real reviews.`,
      gapsHeading: "Needs, worst-served first",
      demand: "mentions in reviews",
      verdictOpen: "Open",
      verdictNarrow: "App-specific",
      verdictThin: "Thin signal",
      painIn: (x, y) => `a top complaint in ${x} of ${y} apps`,
      complaintsLabel: (n) => `${n} in complaints`,
      appsBreakdown: "By app",
      scanned: (n) => `Scored from ${n} reviews`,
      seeReviews: (n) => `See the reviews · ${n}`,
      evidenceTitle: (label) => `Reviews behind “${label}”`,
      evidenceShownOf: (shown, total) => `Showing ${shown} of ${total}`,
      evidenceMethodNote: "Matched by meaning — the highlighted phrase is the exact quote that earned the label.",
      close: "Close",
    },
    deck: { prev: "Previous", next: "Next" },
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
      dislikes: "What's wrong",
      installs: (formatted) => `${formatted}+ installs`,
      monetization: "Monetization pain",
      cantClone: "Hard to rebuild solo",
      buildScore: "Build",
      profitScore: "Profit",
      buildHint: "How realistically a small team could rebuild it (1-5)",
      profitHint: "How much you could realistically earn from a better version (1-5)",
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
      realComplaints: (n) => `Real complaints (${n})`,
      ratingDist: "Rating distribution",
      complaintPattern: "What they complain about",
      buildTitle: "How hard to build",
      showingOf: (shown, total) => `showing ${shown} of ${total}`,
      reviewSpan: (from, to) => (from === to ? from : `${from} – ${to}`),
      ratingsScale: (count) => `${count} ratings`,
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
      more: "Подробнее",
      collapse: "Свернуть",
      signIn: "Войти",
      ideas: "Идеи",
      market: "Рынок",
      market2: "Рынок 2",
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
      title: "Идеи приложений",
      desc: "Мы проанализировали популярные приложения и отзывы реальных пользователей в App Store и Google Play и нашли в проверенных продуктах ошибки, которые можно исправить и забрать часть их аудитории. Делать приложение с уже доказанным спросом — надёжнее, чем угадывать.",
      empty: "Идей пока нет — сначала запустите сбор отзывов.",
      all: "Все",
    },
    market: {
      title: "Карта рынка",
      desc: "Приложения, сгруппированные в рыночные жанры — с ценообразованием, аудиторией и общими болями каждого. Выбери жанр, чтобы увидеть конкретные приложения за ним.",
      pricing: "Ценообразование",
      audience: "Аудитория",
      problems: "Общие проблемы",
      apps: (n) => {
        const mod10 = n % 10;
        const mod100 = n % 100;
        const word =
          mod10 === 1 && mod100 !== 11
            ? "приложение"
            : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
              ? "приложения"
              : "приложений";
        return `${n} ${word}`;
      },
      viewApps: "Смотреть приложения →",
      backToMarket: "← Назад к карте рынка",
    },
    marketDash: {
      title: "Выбери рынок для запуска",
      subtitle: "Каждый жанр — бриф для запуска: доказан ли спрос, занято ли, в чём щель, сложно ли строить и как зарабатывают. По любому можно провалиться глубже.",
      apps: "приложений",
      genres: "жанров",
      installBase: "оценка базы установок",
      ratings: "оценок собрано",
      sortBy: "Сортировка",
      sortScale: "Объём рынка",
      sortGap: "Недовольство",
      sortOpen: "Меньше конкурентов",
      sortBuild: "Проще строить",
      qMarket: "Есть рынок?",
      qCompetition: "Занято?",
      qGap: "В чём щель?",
      qBuild: "Сложно строить?",
      qMoney: "Как зарабатывают",
      players: (n) => {
        const mod10 = n % 10;
        const mod100 = n % 100;
        const word =
          mod10 === 1 && mod100 !== 11
            ? "игрок"
            : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
              ? "игрока"
              : "игроков";
        return `${n} ${word}`;
      },
      leaderPct: (pct) => `лидер ${pct}%`,
      leader: "лидер",
      mInstalls: (v) => `${v}+ установок`,
      mRatings: (v) => `${v} оценок`,
      dataFresh: (date, reviews) => `Отзывы по ${date} · проанализировано ${reviews}`,
      concFragmented: "раздроблено — есть куда зайти",
      concSome: "пара лидеров",
      concCrowded: "занято",
      buildOf5: (v) => `${v}/5`,
      perMonth: "/мес",
      noData: "—",
      tiers: { niche: "Ниша", small: "Малый", mid: "Средний", large: "Крупный", giant: "Гигант" },
      details: "Подробнее",
      whatHated: "Что ненавидят",
      howToWin: "Как выиграть",
      appsInGenre: (n) => {
        const mod10 = n % 10;
        const mod100 = n % 100;
        const word =
          mod10 === 1 && mod100 !== 11
            ? "приложение"
            : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
              ? "приложения"
              : "приложений";
        return `${word} (${n})`;
      },
    },
    market2: {
      title: "Что рынок не закрывает",
      subtitle: "Задачи, ради которых ставят эти приложения — отсортированы по тому, где проваливаются все.",
      pilotNote: (genre) => `Пилот на одном жанре (${genre}). Скоринг вживую из реальных отзывов.`,
      gapsHeading: "Потребности, сначала худшие",
      demand: "упоминаний в отзывах",
      verdictOpen: "Открыто",
      verdictNarrow: "Точечно",
      verdictThin: "Мало сигнала",
      painIn: (x, y) => `топ-жалоба у ${x} из ${y} приложений`,
      complaintsLabel: (n) => `${n} в жалобах`,
      appsBreakdown: "По приложениям",
      scanned: (n) => `Посчитано по ${n} отзывам`,
      seeReviews: (n) => `Показать отзывы · ${n}`,
      evidenceTitle: (label) => `Отзывы за «${label}»`,
      evidenceShownOf: (shown, total) => `Показано ${shown} из ${total}`,
      evidenceMethodNote: "Совпадение по смыслу — подсвеченная фраза это точная цитата, на которой основана метка.",
      close: "Закрыть",
    },
    deck: { prev: "Назад", next: "Вперёд" },
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
      dislikes: "Что не нравится",
      installs: (formatted) => `${formatted}+ установок`,
      monetization: "Боль монетизации",
      cantClone: "В одиночку не повторить",
      buildScore: "Повтор",
      profitScore: "Профит",
      buildHint: "Насколько реально повторить небольшой командой (1–5)",
      profitHint: "Сколько реально на этом заработать улучшенной версией (1–5)",
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
      realComplaints: (n) => `Реальные жалобы (${n})`,
      ratingDist: "Распределение оценок",
      complaintPattern: "На что жалуются",
      buildTitle: "Насколько сложно собрать",
      showingOf: (shown, total) => `показано ${shown} из ${total}`,
      reviewSpan: (from, to) => (from === to ? from : `${from} – ${to}`),
      ratingsScale: (count) => `${count} оценок`,
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
