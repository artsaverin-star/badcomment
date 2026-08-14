import asoLive from "@/data/asoLive.json";
import asoTerms from "@/data/asoTerms.json";
import type { Locale } from "@/lib/i18n";
import { getNiche, getNichePatterns, listReviewCatalogue, reviewNicheTotals, type NichePattern } from "@/lib/reviews";
import { getNicheThesis } from "@/lib/nicheThesis";

export const ROOMDO_APP_ID = "6798765545";

export type AppStoreApp = {
  id: string;
  title: string;
  developer: string;
  description: string;
  icon: string;
  screenshots: string[];
  genres: string[];
  languages: string[];
  rating: number;
  ratings: number;
  version: string;
  releaseDate: string;
  updatedAt: string;
  price: string;
  url: string;
  bundleId: string;
  minimumOsVersion: string;
};

export type AsoEvidence = {
  title: string;
  polarity: "love" | "pain" | "mixed";
  count: number;
  quote?: string;
  app?: string;
};

export type AsoAction = {
  title: string;
  why: string;
  outcome: string;
  evidence?: AsoEvidence;
};

export type AsoAudit = {
  app: AppStoreApp;
  sample: boolean;
  checkedAt: string;
  verdict: string;
  verdictDetail: string;
  strengths: { title: string; detail: string }[];
  actions: AsoAction[];
  niche: {
    slug: string | null;
    name: string;
    apps: number;
    reviews: number;
    governing: string;
    evidence: AsoEvidence[];
  };
  metadata: {
    name: string;
    subtitle: string;
    keywords: string;
    promotionalText: string;
  };
  screenshotPlan: { source: number; headline: string; role: string }[];
  experiment: {
    hypothesis: string;
    control: string;
    variant: string;
    metric: string;
  };
};

type LookupResult = {
  trackId?: number;
  trackName?: string;
  artistName?: string;
  description?: string;
  artworkUrl512?: string;
  artworkUrl100?: string;
  screenshotUrls?: string[];
  genres?: string[];
  languageCodesISO2A?: string[];
  averageUserRating?: number;
  userRatingCount?: number;
  version?: string;
  releaseDate?: string;
  currentVersionReleaseDate?: string;
  formattedPrice?: string;
  trackViewUrl?: string;
  bundleId?: string;
  minimumOsVersion?: string;
};

type LiveTerm = { term?: string };

const ROOMDO_FIXTURE: AppStoreApp = {
  id: ROOMDO_APP_ID,
  title: "Roomdo: To-Do List & Planner",
  developer: "Iaroslav Saverin",
  description:
    "Your tasks stop being a list. They become things you can see.\n\nRoomdo gives every task a place. Home, work, health — each part of your life gets its own room, and the things to do sit there like real objects: a watering can for the plants, a wallet for the rent, a running shoe for the walk you keep putting off.\n\nNothing is buried in a list you have to read. You glance at the room and you know.\n\nWHAT'S INSIDE\n• Today — only what's due today, nothing else fighting for attention\n• Rooms — a space for each part of your life, with your tasks living in it\n• Dates, times and reminders that arrive on their own\n• Repeats — water the plants every three days, and it comes back by itself\n• Checklists inside a task, for the things that have steps\n• Done — a wall of the days you actually finished something\n\nFREE\nThe task manager is free. All of it: dates, reminders, repeats, checklists, three spaces.\n\nROOMDO PLUS\n• Unlimited spaces\n• All 74 interiors\n• All 500 objects to choose from\n\nYour tasks stay on your device and sync through your own iCloud. No account, no sign-up, nothing collected.",
  icon: "https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/36/b7/d4/36b7d48b-e96e-5f01-4de6-4ba008f3c0d1/AppIcon-0-0-1x_U007ephone-0-1-85-220.png/512x512bb.jpg",
  screenshots: [
    "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/4b/a9/c2/4ba9c2a5-a7b8-39f1-4e32-2b632554771a/01-today.png/640x960bb.jpg",
    "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/04/97/2e/04972e5e-26a6-b1e3-8b60-a45499b64ab2/02-spaces.png/640x960bb.jpg",
    "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/4b/11/4e/4b114e1e-53eb-7c41-903a-2c0646291706/03-room-me.png/640x960bb.jpg",
    "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/f4/e6/6a/f4e66a09-9073-2932-4c24-e2d41beb097e/04-card.png/640x960bb.jpg",
    "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/47/25/0f/47250fef-6256-f35d-b25d-d295cfefbe99/05-room-home.png/640x960bb.jpg",
    "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/39/dc/8f/39dc8f4f-fb73-baae-eba3-1c75ff771efb/06-paywall.png/640x960bb.jpg",
  ],
  genres: ["Productivity", "Lifestyle"],
  languages: ["EN", "FR", "DE", "IT", "JA", "PL", "PT", "RU", "ZH", "ES", "TR", "UK"],
  rating: 0,
  ratings: 0,
  version: "1.0",
  releaseDate: "2026-08-14T00:23:32Z",
  updatedAt: "2026-08-14T00:23:32Z",
  price: "Free",
  url: "https://apps.apple.com/us/app/roomdo-to-do-list-planner/id6798765545",
  bundleId: "com.artsaverin.branches",
  minimumOsVersion: "18.0",
};

const NICHE_HINTS: Record<string, string[]> = {
  "calendars-tasks": ["to do", "todo", "task", "planner", "calendar", "schedule", "agenda"],
  "habit-tracking": ["habit", "streak", "routine tracker"],
  "notes-pkm": ["notes", "notebook", "markdown", "second brain", "knowledge base"],
  "focus-productivity": ["pomodoro", "focus timer", "block distractions"],
  "meditation-mindfulness": ["meditation", "mindfulness", "breathing"],
  "sleep-tracking": ["sleep tracker", "sleep cycle", "smart alarm"],
  "white-noise-sleep-sounds": ["white noise", "sleep sounds", "rain sounds"],
  "workout-fitness": ["workout", "fitness", "gym", "exercise"],
  "run-tracking": ["running", "run tracker", "jogging"],
  "nutrition-calories": ["calorie", "nutrition", "food tracker", "macros"],
  "personal-finance": ["budget", "expense", "finance", "spending"],
  "scanner-pdf": ["scanner", "scan pdf", "document scan", "ocr"],
  "photo-editing": ["photo editor", "edit photos", "filters"],
  "ai-image-generation": ["ai image", "image generator", "text to image"],
  "ai-chatbot": ["ai chat", "chatbot", "ai assistant"],
  "language-learning": ["learn language", "language lessons", "speak spanish"],
  translator: ["translator", "translate", "translation"],
  "password-manager": ["password manager", "password vault", "passkey"],
  "weather-apps": ["weather", "forecast", "weather radar"],
  "travel-planning": ["trip planner", "travel planner", "itinerary"],
  "dating-apps": ["dating", "meet singles", "find love"],
  "recipes-meal-planning": ["recipes", "meal planner", "grocery list"],
  "plant-care": ["plant care", "plant identifier", "watering plants"],
  "water-hydration": ["water tracker", "hydration", "drink water"],
};

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function firstParagraph(value: string): string {
  return value.split(/\n\s*\n/)[0]?.trim() || value.trim();
}

function fit(value: string, limit: number): string {
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= limit) return clean;
  const clipped = clean.slice(0, limit + 1);
  const atWord = clipped.slice(0, Math.max(0, clipped.lastIndexOf(" "))).trim();
  return (atWord || clean.slice(0, limit)).slice(0, limit);
}

function evidenceFrom(pattern?: NichePattern): AsoEvidence | undefined {
  if (!pattern) return undefined;
  return {
    title: pattern.title,
    polarity: pattern.polarity,
    count: pattern.count || 0,
    quote: pattern.evidence[0]?.quote,
    app: pattern.evidence[0]?.app,
  };
}

function findPattern(patterns: NichePattern[], words: string[]): NichePattern | undefined {
  return patterns.find((pattern) => {
    const text = normalizeText(`${pattern.title} ${pattern.titleEn || ""}`);
    return words.some((word) => text.includes(normalizeText(word)));
  });
}

export function parseAppStoreInput(input: string): { id: string; country: string } | null {
  const clean = input.trim();
  if (/^\d{7,12}$/.test(clean)) return { id: clean, country: "us" };
  let url: URL;
  try {
    url = new URL(clean);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.hostname !== "apps.apple.com") return null;
  const match = url.pathname.match(/\/id(\d{7,12})(?:\/|$)/);
  if (!match) return null;
  const country = url.pathname.split("/").filter(Boolean)[0];
  return { id: match[1], country: /^[a-z]{2}$/i.test(country || "") ? country.toLowerCase() : "us" };
}

export function normalizeLookupResult(raw: LookupResult): AppStoreApp | null {
  if (!raw.trackId || !raw.trackName) return null;
  return {
    id: String(raw.trackId),
    title: raw.trackName,
    developer: raw.artistName || "",
    description: raw.description || "",
    icon: raw.artworkUrl512 || raw.artworkUrl100 || "",
    screenshots: Array.isArray(raw.screenshotUrls) ? raw.screenshotUrls.slice(0, 10) : [],
    genres: Array.isArray(raw.genres) ? raw.genres : [],
    languages: Array.isArray(raw.languageCodesISO2A) ? raw.languageCodesISO2A : [],
    rating: Number(raw.averageUserRating || 0),
    ratings: Number(raw.userRatingCount || 0),
    version: raw.version || "",
    releaseDate: raw.releaseDate || "",
    updatedAt: raw.currentVersionReleaseDate || raw.releaseDate || "",
    price: raw.formattedPrice || "",
    url: raw.trackViewUrl || `https://apps.apple.com/app/id${raw.trackId}`,
    bundleId: raw.bundleId || "",
    minimumOsVersion: raw.minimumOsVersion || "",
  };
}

export async function fetchAppStoreApp(input: string): Promise<AppStoreApp> {
  const parsed = parseAppStoreInput(input);
  if (!parsed) throw new Error("invalid_app_store_url");
  if (parsed.id === ROOMDO_APP_ID) return ROOMDO_FIXTURE;

  const endpoint = `https://itunes.apple.com/lookup?id=${parsed.id}&country=${parsed.country}`;
  const response = await fetch(endpoint, {
    headers: { accept: "application/json", "user-agent": "inApp-ASO/1.0" },
    next: { revalidate: 21600 },
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error("app_store_unavailable");
  const body = (await response.json()) as { resultCount?: number; results?: LookupResult[] };
  const app = normalizeLookupResult(body.results?.[0] || {});
  if (!body.resultCount || !app) throw new Error("app_not_found");
  return app;
}

function inferNiche(app: AppStoreApp, locale: Locale): { slug: string; name: string } | null {
  if (app.id === ROOMDO_APP_ID) {
    const niche = getNiche("calendars-tasks");
    return { slug: "calendars-tasks", name: locale === "en" ? niche?.nameEn || "Calendar & tasks" : niche?.name || "Календари и задачи" };
  }

  const title = normalizeText(app.title);
  const description = normalizeText(app.description.slice(0, 1800));
  const catalog = listReviewCatalogue(locale);
  let best: { slug: string; name: string; score: number } | null = null;

  for (const niche of catalog) {
    const live = ((asoLive as Record<string, { terms?: LiveTerm[] }>)[niche.slug]?.terms || []).map((item) => item.term || "");
    const baked = (asoTerms as Record<string, string[]>)[niche.slug] || [];
    const phrases = [niche.name, niche.slug.replace(/-/g, " "), ...(NICHE_HINTS[niche.slug] || []), ...baked.slice(0, 10), ...live.slice(0, 8)]
      .map(normalizeText)
      .filter((value) => value.length >= 3);
    let score = 0;
    for (const phrase of new Set(phrases)) {
      if (title.includes(phrase)) score += Math.min(14, 5 + phrase.split(" ").length * 3);
      else if (description.includes(phrase)) score += Math.min(4, phrase.split(" ").length);
    }
    if (!best || score > best.score) best = { slug: niche.slug, name: niche.name, score };
  }
  return best && best.score >= 5 ? best : null;
}

function roomdoAudit(app: AppStoreApp, locale: Locale, patterns: NichePattern[]): Pick<AsoAudit, "verdict" | "verdictDetail" | "strengths" | "actions" | "metadata" | "screenshotPlan" | "experiment"> {
  const ru = locale !== "en";
  const reminders = evidenceFrom(findPattern(patterns, ["напомин", "reminder"]));
  const simplicity = evidenceFrom(findPattern(patterns, ["простот", "simplicity"]));
  const widget = evidenceFrom(findPattern(patterns, ["виджет на", "home-screen widget"]));

  return {
    verdict: ru ? "Сильный продукт спрятан за витриной обычного планировщика" : "A distinctive product is hidden behind a generic planner storefront",
    verdictDetail: ru
      ? "Главное отличие Roomdo — задачи как предметы в комнатах. Но название и первые два скриншота сначала показывают обычный список и сетку пространств. Посетитель может уйти, не увидев причину выбрать именно Roomdo."
      : "Roomdo's differentiator is turning tasks into visible objects inside rooms. The name and first two screenshots lead with a conventional list and a spaces grid, so visitors can leave before seeing why Roomdo is different.",
    strengths: ru
      ? [
          { title: "Отличие видно за секунду", detail: "Экран с комнатой и предметами невозможно спутать с Todoist или обычным списком." },
          { title: "Описание начинает с результата", detail: "“Your tasks stop being a list” — ясное и запоминающееся обещание." },
          { title: "Честная бесплатная основа", detail: "Напоминания, повторы и чек-листы остаются бесплатными; платёж открывает визуальное разнообразие." },
          { title: "Приватность встроена в продукт", detail: "Без аккаунта, данные на устройстве и синхронизация через iCloud." },
        ]
      : [
          { title: "A visible differentiator", detail: "The room-and-objects screen cannot be mistaken for Todoist or another plain list." },
          { title: "The description opens on the outcome", detail: "“Your tasks stop being a list” is clear and memorable." },
          { title: "An honest free core", detail: "Reminders, repeats and checklists stay free; payment unlocks visual variety." },
          { title: "Privacy is part of the product", detail: "No account, on-device data and iCloud sync." },
        ],
    actions: ru
      ? [
          {
            title: "Поставить комнату первым скриншотом",
            why: "Сейчас первый кадр выглядит как знакомый список задач. Самый сильный визуальный клин появляется только третьим.",
            outcome: "Первый экран должен за 1–2 секунды объяснить: здесь задачи можно увидеть как предметы, а не читать стеной текста.",
            evidence: simplicity,
          },
          {
            title: "Перенести слово Visual в название",
            why: "“To‑Do List & Planner” описывает категорию, но не объясняет, почему Roomdo существует. Название уже занимает 28 из 30 символов общими словами.",
            outcome: "Тестовый вариант: “Roomdo: Visual To‑Do List” — 25 из 30 символов.",
          },
          {
            title: "Добавить виджет до расширения каталога интерьеров",
            why: "В описании и скриншотах нет домашнего виджета. В нашей выборке это один из сильнейших механизмов ежедневного возврата.",
            outcome: "Минимальный виджет Today: увидеть четыре дела, отметить выполненное и быстро добавить новое.",
            evidence: widget,
          },
          {
            title: "Показать напоминание как гарантию, а не пункт списка",
            why: "На четвёртом скриншоте у задачи стоит “No reminder”, хотя надёжное напоминание — базовый контракт категории.",
            outcome: "Показать установленное время и сформулировать обещание: “Set it once. Roomdo will remind you.”",
            evidence: reminders,
          },
        ]
      : [
          {
            title: "Lead with the room screenshot",
            why: "The current first frame looks like a familiar task list. The strongest visual wedge only appears third.",
            outcome: "The first frame should explain in 1–2 seconds: tasks become visible objects instead of a wall of text.",
            evidence: simplicity,
          },
          {
            title: "Put “Visual” in the name",
            why: "“To‑Do List & Planner” names the category but not the reason Roomdo exists. Generic terms currently use 28 of 30 characters.",
            outcome: "Test: “Roomdo: Visual To‑Do List” — 25 of 30 characters.",
          },
          {
            title: "Build a widget before more interiors",
            why: "There is no home-screen widget in the description or screenshots. In our sample, it is one of the strongest daily-return mechanisms.",
            outcome: "A minimal Today widget: see four tasks, tick one off and capture a new one.",
            evidence: widget,
          },
          {
            title: "Show reminders as a guarantee, not a feature bullet",
            why: "The fourth screenshot visibly says “No reminder,” while reliable reminders are the category's trust contract.",
            outcome: "Show a real reminder time and promise: “Set it once. Roomdo will remind you.”",
            evidence: reminders,
          },
        ],
    metadata: {
      name: "Roomdo: Visual To-Do List",
      subtitle: "Visual daily planner for ADHD",
      keywords: "tasks,todo,organizer,reminder,checklist,adhd,focus,chores,routine,home,visual,productivity",
      promotionalText: "Turn tasks into objects you can see. Open a room, glance at what needs doing, and move through your day without a wall of text.",
    },
    screenshotPlan: ru
      ? [
          { source: 3, headline: "Задачи, которые можно увидеть", role: "Первым показать уникальную механику комнат" },
          { source: 1, headline: "Сегодня — одним взглядом", role: "Объяснить ежедневный сценарий" },
          { source: 2, headline: "Комната для каждой части жизни", role: "Показать структуру без проектов и папок" },
          { source: 4, headline: "Напоминания, повторы и чек-листы", role: "Доказать, что за визуальностью есть полноценный планировщик" },
          { source: 5, headline: "Домашние дела перед глазами", role: "Раскрыть второй понятный сценарий" },
          { source: 6, headline: "Сам планировщик остаётся бесплатным", role: "Объяснить честную границу оплаты" },
        ]
      : [
          { source: 3, headline: "Tasks you can actually see", role: "Lead with the unique room mechanic" },
          { source: 1, headline: "Today at a glance", role: "Explain the everyday loop" },
          { source: 2, headline: "A room for every part of life", role: "Show structure without projects and folders" },
          { source: 4, headline: "Reminders, repeats and checklists", role: "Prove there is a complete planner behind the visual idea" },
          { source: 5, headline: "Home tasks in plain sight", role: "Reveal a second relatable use case" },
          { source: 6, headline: "The task manager stays free", role: "Explain the honest payment boundary" },
        ],
    experiment: {
      hypothesis: ru
        ? "Если первым показать визуальную комнату и назвать отличие, больше посетителей поймут продукт до того, как пролистают страницу."
        : "If the first frame shows a visual room and names the difference, more visitors will understand the product before scrolling.",
      control: ru ? "Текущий первый кадр: стандартный список Today без заголовка" : "Current first frame: a standard Today list without a headline",
      variant: ru ? "Комната Me + заголовок “Задачи, которые можно увидеть”" : "The Me room + “Tasks you can actually see”",
      metric: ru ? "Конверсия страницы в первую загрузку" : "Product-page conversion to first-time download",
    },
  };
}

function genericAudit(app: AppStoreApp, locale: Locale, nicheName: string, metadataNicheName: string, patterns: NichePattern[]): Pick<AsoAudit, "verdict" | "verdictDetail" | "strengths" | "actions" | "metadata" | "screenshotPlan" | "experiment"> {
  const ru = locale !== "en";
  const topPain = patterns.find((pattern) => pattern.polarity === "pain");
  const topLove = patterns.find((pattern) => pattern.polarity === "love");
  const brand = app.title.split(/[:—–-]/)[0]?.trim() || app.title;
  const opening = firstParagraph(app.description);
  const keywords = [...new Set(normalizeText(`${metadataNicheName} ${app.genres.join(" ")}`).split(" ").filter((word) => word.length > 3))].join(",").slice(0, 100);
  const proposedName = fit(`${brand}: ${metadataNicheName}`, 30);
  const subtitle = fit(opening.replace(new RegExp(`^${brand}\\s*`, "i"), ""), 30);
  const firstShot = app.screenshots.length ? 1 : 0;
  const languageLabel = ru
    ? app.languages.length % 10 === 1 && app.languages.length % 100 !== 11
      ? `${app.languages.length} язык`
      : app.languages.length % 10 >= 2 && app.languages.length % 10 <= 4 && !(app.languages.length % 100 >= 12 && app.languages.length % 100 <= 14)
        ? `${app.languages.length} языка`
        : `${app.languages.length || 1} языков`
    : `${app.languages.length || 1} ${app.languages.length === 1 ? "localization" : "localizations"}`;

  return {
    verdict: ru ? "Страница найдена — сначала усиливаем понятность первого экрана" : "Storefront found — start by sharpening the first screen",
    verdictDetail: ru
      ? `Мы сопоставили приложение с нишей «${nicheName}». Бесплатная часть аудита показывает приоритеты; готовый пакет метаданных ниже является черновиком и должен быть проверен на реальной выдаче.`
      : `We matched the app to “${nicheName}”. The free audit shows priorities; the metadata pack below is a draft and should be checked against the live search results.`,
    strengths: [
      {
        title: ru ? `${app.screenshots.length} скриншотов уже опубликовано` : `${app.screenshots.length} screenshots are already live`,
        detail: ru ? "Можно начать с переупорядочивания и новых заголовков, не переделывая весь набор." : "Start with ordering and new headlines instead of rebuilding the whole set.",
      },
      {
        title: languageLabel,
        detail: ru ? "Следующий рост можно искать не только в английской выдаче." : "The next growth pocket does not have to come only from the English storefront.",
      },
    ],
    actions: [
      {
        title: ru ? "Сформулировать одно отличие в первых 30 символах" : "State one differentiator inside the first 30 characters",
        why: ru ? `Текущее название — ${app.title.length} символов. Название должно не только назвать категорию, но и объяснить выбор.` : `The current name is ${app.title.length} characters. It should identify the category and explain the choice.`,
        outcome: ru ? `Черновик: “${proposedName}”` : `Draft: “${proposedName}”`,
      },
      {
        title: ru ? "Превратить первый скриншот в обещание результата" : "Turn the first screenshot into an outcome promise",
        why: ru ? "Первые три кадра видны до подробного чтения описания; один из них должен объяснять ценность без знания продукта." : "The first three frames appear before a careful description read; one must explain the value without prior product knowledge.",
        outcome: ru ? "Один короткий заголовок, один сценарий, один визуальный фокус." : "One short headline, one use case and one visual focus.",
        evidence: evidenceFrom(topLove),
      },
      {
        title: ru ? "Закрыть главный страх ниши прямо на странице" : "Answer the category's biggest fear on the storefront",
        why: topPain?.title || (ru ? "В нише есть повторяющийся барьер доверия, который мешает установке." : "The category has a recurring trust barrier that blocks installs."),
        outcome: ru ? "Показать механизм и доказательство, а не просто заявить, что функция есть." : "Show the mechanism and proof instead of merely claiming the feature exists.",
        evidence: evidenceFrom(topPain),
      },
    ],
    metadata: {
      name: proposedName,
      subtitle: subtitle || fit(`A simpler ${metadataNicheName.toLowerCase()}`, 30),
      keywords,
      promotionalText: fit(opening, 170),
    },
    screenshotPlan: app.screenshots.slice(0, 6).map((_, index) => ({
      source: index + 1,
      headline: index === 0 ? (ru ? "Главный результат для пользователя" : "The user's primary outcome") : index === 1 ? (ru ? "Как это работает" : "How it works") : (ru ? `Доказательство №${index}` : `Proof point ${index}`),
      role: index === 0 ? (ru ? "Объяснить выбор приложения" : "Explain why this app") : (ru ? "Раскрыть один конкретный сценарий" : "Reveal one concrete use case"),
    })),
    experiment: {
      hypothesis: ru ? "Ясное обещание на первом кадре увеличит долю посетителей, которые доходят до установки." : "A clear first-frame promise will increase the share of visitors who install.",
      control: ru ? `Текущий скриншот №${firstShot || 1}` : `Current screenshot #${firstShot || 1}`,
      variant: ru ? "Первый кадр с результатом и одним доказательством" : "A first frame with the outcome and one proof point",
      metric: ru ? "Конверсия страницы в первую загрузку" : "Product-page conversion to first-time download",
    },
  };
}

export function buildAsoAudit(app: AppStoreApp, locale: Locale): AsoAudit {
  const inferred = inferNiche(app, locale);
  const slug = inferred?.slug || null;
  const patterns = slug ? getNichePatterns(slug, locale) : [];
  const totals = slug ? reviewNicheTotals(slug) : null;
  const thesis = slug ? getNicheThesis(slug, locale) : null;
  const fallbackName = locale === "en" ? app.genres[0] || "App Store category" : app.genres[0] || "Категория App Store";
  const nicheName = inferred?.name || fallbackName;
  const metadataNicheName = slug ? getNiche(slug)?.nameEn || nicheName : app.genres[0] || "App";
  const content = app.id === ROOMDO_APP_ID ? roomdoAudit(app, locale, patterns) : genericAudit(app, locale, nicheName, metadataNicheName, patterns);

  return {
    app,
    sample: app.id === ROOMDO_APP_ID,
    checkedAt: app.id === ROOMDO_APP_ID ? "2026-08-14" : new Date().toISOString().slice(0, 10),
    ...content,
    niche: {
      slug,
      name: nicheName,
      apps: totals?.apps || 0,
      reviews: totals?.reviews || 0,
      governing: thesis?.governing || "",
      evidence: patterns.slice(0, 6).map((pattern) => evidenceFrom(pattern)!).filter(Boolean),
    },
  };
}
