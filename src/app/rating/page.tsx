import type { Metadata } from "next";
import { ogImage } from "@/lib/og";
import Link from "next/link";
import { getLocale } from "@/lib/i18n.server";
import { RATING_BY_SLUG } from "@/data/peoplesRating";

type RApp = { icon: string | null; ratings: number };
type RFile = { count?: number; apps?: RApp[] };
const RATING = RATING_BY_SLUG as Record<string, RFile>;

// Top app icons of a niche for the card strip, biggest first.
function iconsFor(slug: string): string[] {
  return (RATING[slug]?.apps ?? [])
    .slice()
    .sort((a, b) => (b.ratings || 0) - (a.ratings || 0))
    .map((a) => a.icon)
    .filter((x): x is string => !!x)
    .slice(0, 4);
}

function appsWord(n: number, ru: boolean): string {
  if (!ru) return "apps";
  const dd = n % 100, d = n % 10;
  if (dd >= 11 && dd <= 14) return "приложений";
  if (d === 1) return "приложение";
  if (d >= 2 && d <= 4) return "приложения";
  return "приложений";
}

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const ru = locale !== "en";
  const title = ru ? "Народный рейтинг приложений по реальным отзывам" : "People's app rating by real reviews";
  const description = ru
    ? "100 приложений на нишу, оценённых по реальным отзывам, а не по витринной звезде, плюс проверка на накрутку рейтинга."
    : "100 apps per niche scored by real reviews, not the storefront star, plus a rating-authenticity check.";
  const url = `https://inapp.pro/${ru ? "ru" : "en"}/rating`;
  const og = ogImage(ru);
  return {
    title, description,
    alternates: { canonical: url, languages: { ru: "https://inapp.pro/ru/rating", en: "https://inapp.pro/en/rating", "x-default": "https://inapp.pro/en/rating" } },
    openGraph: { title, description, type: "website", url, siteName: "inApp", locale: ru ? "ru_RU" : "en_US", images: [og] },
    twitter: { card: "summary_large_image", title, description, images: [og] },
    robots: { index: true, follow: true },
  };
}

import { byNicheMoney } from "@/lib/nicheMoney";

// Latest-wave niches get a «new» badge until the next wave lands.
const NEW_NICHES = new Set([
  "astronomy-stargazing", "cycling", "interior-design", "fishing",
  "couples-relationship", "hiking-trails", "teleprompter-captions",
]);

const NICHES_RAW = [
  { slug: "stock-investing", name: "Акции", nameEn: "Stock investing", blurb: "73 приложения: где брокер и трекер надёжны в момент сделки, а где блок вывода средств, фейковые AI-сигналы и накрутка.", blurbEn: "73 apps: where the broker and tracker hold up when it matters, and where it is frozen withdrawals, fake AI signals and juiced reviews." },
  { slug: "weight-tracker", name: "Вес", nameEn: "Weight tracker", blurb: "27 приложений: где дневник веса честный и не стыдит, а где потеря истории, подписочные ловушки и накрутка.", blurbEn: "27 apps: where the weight diary is honest and shame-free, and where it is lost history, subscription traps and juiced reviews." },
  { slug: "driving-test-prep", name: "Экзамен на права", nameEn: "Driving test prep", blurb: "43 приложения: где вопросы совпадают с реальным экзаменом DMV, а где устаревшая база, пейвол-ловушки и накрутка.", blurbEn: "43 apps: where the questions match the real DMV exam, and where it is a stale question bank, paywall traps and juiced reviews." },
  { slug: "step-counter", name: "Шагомер", nameEn: "Step counter", blurb: "64 приложения: где счётчик шагов честен и точен, а где скам ходи-зарабатывай и накрутка (14 из 64 накручены).", blurbEn: "64 apps: where the step counter is honest and accurate, and where walk-to-earn scams and juiced reviews take over (14 of 64 are fake)." },
  { slug: "blood-pressure-log", name: "Давление", nameEn: "Blood pressure", blurb: "52 приложения: где дневник давления честный и отчёт врачу под рукой, а где замер пальцем по камере и накрутка (25 из 52 накручены).", blurbEn: "52 apps: where the BP diary is honest and the doctor report is one tap away, and where it's finger-on-camera fakery and juiced reviews (25 of 52 are fake)." },
  { slug: "pregnancy-tracker", name: "Беременность", nameEn: "Pregnancy", blurb: "43 приложения: где счётчик недель и срок точны, а тревога отступает, а где накрутка и слетают данные.", blurbEn: "43 apps: where the week counter and due date are accurate and the anxiety eases, and where it's fake reviews and lost data." },
  { slug: "astrology", name: "Астрология", nameEn: "Astrology", blurb: "Честная оценка и проверка на накрутку звезды.", blurbEn: "An honest score and a check for fake-star inflation." },
  { slug: "dating-apps", name: "Знакомства", nameEn: "Dating", blurb: "Где реальные люди, а где боты и накрученные звёзды.", blurbEn: "Where the people are real, and where it's bots and inflated stars." },
  { slug: "ai-avatars-headshots", name: "ИИ-фото", nameEn: "AI photo", blurb: "Где результат правда похож на тебя, а где обман в рекламе.", blurbEn: "Where the result really looks like you, and where the ads lie." },
  { slug: "meditation-mindfulness", name: "Медитация", nameEn: "Meditation", blurb: "Где правда успокаивает и тёплый голос, а где пустышка.", blurbEn: "Where it truly calms you with a warm voice, and where it's hollow." },
  { slug: "photo-editing", name: "Фоторедакторы", nameEn: "Photo editors", blurb: "Где инструменты реально работают, а где портят фото.", blurbEn: "Where the tools actually work, and where they wreck your photos." },
  { slug: "notes-pkm", name: "Заметки", nameEn: "Notes", blurb: "Где мысль пишется мгновенно и не теряется, а где тормозит.", blurbEn: "Where a thought lands instantly and never gets lost, and where it lags." },
  { slug: "language-learning", name: "Изучение языков", nameEn: "Language learning", blurb: "Где правда доводят до речи, а где только стрики и игра.", blurbEn: "Where they really get you speaking, and where it's just streaks and games." },
  { slug: "period-cycle", name: "Месячные", nameEn: "Period trackers", blurb: "Где прогноз точен и данные в безопасности, а где торгуют приватностью.", blurbEn: "Where the forecast is accurate and your data is safe, and where they sell your privacy." },
  { slug: "habit-tracking", name: "Привычки", nameEn: "Habit trackers", blurb: "Где отметка мгновенна и напоминание приходит, а где стрик стыдит.", blurbEn: "Where a check-in is instant and reminders show up, and where the streak shames you." },
  { slug: "personal-finance", name: "Личные финансы", nameEn: "Budget apps", blurb: "Где правда держишь траты под контролем, а где рвётся синхронизация.", blurbEn: "Where you truly keep spending in check, and where sync keeps breaking." },
  { slug: "calendars-tasks", name: "Календари и задачи", nameEn: "Calendars & tasks", blurb: "Где напоминание приходит вовремя и ничего не теряется.", blurbEn: "Where reminders arrive on time and nothing slips through." },
  { slug: "nutrition-calories", name: "Калории и питание", nameEn: "Calorie & nutrition", blurb: "Где подсчёт калорий честный и удобный, а где база врёт и тормозит.", blurbEn: "Where calorie counting is honest and easy, and where the database lies and lags." },
  { slug: "crypto-investing", name: "Крипта и инвестиции", nameEn: "Crypto & investing apps", blurb: "93 приложения: где кошелёк и биржа честны и надёжны, а где накрутка и заморозка средств.", blurbEn: "93 apps: where the wallet and exchange are honest and reliable, and where it's fakery and frozen funds." },
  { slug: "music-streaming", name: "Музыка и стриминг", nameEn: "Music streaming apps", blurb: "94 приложения: где каталог, звук и плейлисты честны и удобны, а где накрутка и потеря музыки.", blurbEn: "94 apps: where the catalog, sound and playlists are honest and easy, and where it's fakery and lost music." },
  { slug: "video-streaming", name: "Видео и стриминг", nameEn: "Video streaming apps", blurb: "95 приложений: где каталог, плеер и синхронизация честны, а где накрутка и геоблок.", blurbEn: "95 apps: where the catalog, player and sync are honest, and where it's fakery and geoblocks." },
  { slug: "food-delivery", name: "Доставка еды", nameEn: "Food delivery apps", blurb: "94 приложения: где заказ приходит точно и вовремя, а где накрутка и сломанная поддержка.", blurbEn: "94 apps: where the order arrives right and on time, and where it's fakery and broken support." },
  { slug: "messaging-apps", name: "Мессенджеры", nameEn: "Messaging apps", blurb: "94 приложения: где сообщения и звонки доходят надёжно и приватно, а где накрутка и пропавшие СМС.", blurbEn: "94 apps: where messages and calls land reliably and privately, and where it's fakery and vanished texts." },
  { slug: "shopping-ecommerce", name: "Покупки и маркетплейсы", nameEn: "Shopping & ecommerce apps", blurb: "95 приложений: где товар приходит как на фото и возврат работает, а где контрафакт и фиктивная доставка.", blurbEn: "95 apps: where the item matches the photo and returns work, and where it's counterfeits and phantom delivery." },
  { slug: "ride-hailing", name: "Такси и поездки", nameEn: "Ride-hailing apps", blurb: "87 приложений: где машина приезжает вовремя и водителю честно платят, а где накрутка и сорванный заказ.", blurbEn: "87 apps: where the car arrives on time and drivers get paid fairly, and where it's fakery and canceled rides." },
  { slug: "weather-apps", name: "Погода", nameEn: "Weather apps", blurb: "92 приложения: где прогноз сбывается и оповещение приходит вовремя, а где врёт радар и сыплет реклама.", blurbEn: "92 apps: where the forecast holds and alerts arrive on time, and where the radar lies and ads pile up." },
  { slug: "travel-planning", name: "Планирование путешествий", nameEn: "Travel planning apps", blurb: "90 приложений: где маршрут и брони не теряются и работают офлайн за границей, а где накрутка и сбои.", blurbEn: "90 apps: where routes and bookings stay put and work offline abroad, and where it's fakery and glitches." },
  { slug: "sleep-tracking", name: "Сон и звуки для сна", nameEn: "Sleep tracking & sounds apps", blurb: "94 приложения: где трекинг сна точен и звуки убаюкивают, а где будильник врёт и сыплет реклама.", blurbEn: "94 apps: where sleep tracking is accurate and the sounds lull you, and where the alarm fails and ads pile up." },
  { slug: "focus-productivity", name: "Фокус и продуктивность", nameEn: "Focus & productivity timer apps", blurb: "72 приложения: где таймер работает в фоне и блокировка отвлечений держит, а где гимик и накрутка.", blurbEn: "72 apps: where the timer runs in the background and blocking holds, and where it's gimmicks and fakery." },
  { slug: "journaling-mood", name: "Дневники и настроение", nameEn: "Journaling & mood apps", blurb: "95 приложений: где писать легко и видно динамику настроения, а где давит стрик и течёт приватность.", blurbEn: "95 apps: where writing is easy and mood trends are clear, and where the streak pressures and privacy leaks." },
  { slug: "workout-fitness", name: "Тренировки и фитнес", nameEn: "Workout & fitness apps", blurb: "91 приложение: где лог тренировки быстрый и прогрессия считается, а где накрутка и слетает история.", blurbEn: "91 apps: where logging a workout is fast and progression counts, and where it's fakery and lost history." },
  { slug: "recipes-meal-planning", name: "Рецепты и меню", nameEn: "Recipe & meal-planning apps", blurb: "77 приложений: где рецепт сохраняется из сети и список покупок собирается сам, а где теряется коллекция.", blurbEn: "77 apps: where recipes save from the web and the shopping list builds itself, and where your collection just vanishes." },
  { slug: "plant-care", name: "Уход за растениями", nameEn: "Plant care & identifier apps", blurb: "58 приложений: где полив напоминается умно и диагноз честный, а где накрутка и шаблонные советы.", blurbEn: "58 apps: where watering reminders are smart and diagnoses are honest, and where it's fake reviews and canned advice." },
  { slug: "baby-tracking", name: "Уход за малышом", nameEn: "Baby tracking apps", blurb: "61 приложение: где лог кормления и сна жмётся одной рукой в 3 ночи и синхронится с партнёром, а где теряются данные.", blurbEn: "61 apps: where the feed and sleep log taps one-handed at 3am and syncs with your partner, and where data goes missing." },
  { slug: "ai-writing", name: "ИИ-помощники для текста", nameEn: "AI writing assistant apps", blurb: "87 приложений: где ИИ реально помогает писать, а где тонкая обёртка над ChatGPT с накруткой (36 из 87 накручены).", blurbEn: "87 apps: where AI actually helps you write, and where it's a thin ChatGPT wrapper with fake reviews (36 of 87 are juiced)." },
  { slug: "scanner-pdf", name: "Сканеры документов", nameEn: "Document scanners", blurb: "Где скан чёткий и экспорт не подводит, а где качество хуже камеры и накрутка.", blurbEn: "Where the scan is crisp and export never fails, and where quality is worse than the camera and reviews are faked." },
  { slug: "ai-chatbot", name: "ИИ-ассистенты", nameEn: "AI assistants", blurb: "Где ассистент реально помогает и помнит контекст, а где обёртка над GPT с накруткой.", blurbEn: "Where the assistant actually helps and remembers context, and where it's a GPT wrapper with fake reviews." },
  { slug: "intermittent-fasting", name: "Интервальное голодание", nameEn: "Intermittent fasting", blurb: "Где таймер и фазы голодания честны, а где накрутка и агрессивный пейволл.", blurbEn: "Where the timer and fasting phases are honest, and where it's fake reviews and an aggressive paywall." },
  { slug: "flashcards", name: "Флешкарты для учёбы", nameEn: "Study flashcards", blurb: "Где алгоритм повторений реально учит, а где теряется прогресс.", blurbEn: "Where the spaced-repetition algorithm actually teaches, and where your progress gets lost." },
  { slug: "translator", name: "Переводчики", nameEn: "Translator apps", blurb: "Где перевод точен и голос понятен, а где пустая обёртка и накрутка.", blurbEn: "Where translation is accurate and the voice is clear, and where it's an empty wrapper with fake reviews." },
  { slug: "run-tracking", name: "Трекеры бега", nameEn: "Running trackers", blurb: "Где GPS точен и план доводит до 5K, а где дрейф трека и сбои.", blurbEn: "Where GPS is accurate and the plan gets you to 5K, and where the track drifts and it crashes." },
  { slug: "voice-recorder", name: "Диктофоны и транскрипция", nameEn: "Voice recorders", blurb: "Где запись и расшифровка честны, а где скам-рекордеры звонков с накруткой.", blurbEn: "Where recording and transcription are honest, and where it's scam call-recorders with fake reviews." },
  { slug: "resume-builder", name: "Конструкторы резюме", nameEn: "Resume builders", blurb: "Где PDF выходит чисто и без стены оплаты, а где готовое резюме держат в заложниках.", blurbEn: "Where the PDF exports clean with no paywall, and where they hold your finished resume hostage." },
  { slug: "invoice-maker", name: "Счета и инвойсы", nameEn: "Invoice makers", blurb: "Где счёт уходит клиенту и статус оплаты виден, а где рвётся синхронизация.", blurbEn: "Where the invoice reaches the client and payment status is visible, and where sync falls apart." },
  { slug: "sobriety", name: "Трезвость и отказ от привычек", nameEn: "Sobriety & quitting", blurb: "Где счётчик держит и срыв обрабатывается без стыда, а где пустышка.", blurbEn: "Where the counter holds and a relapse is handled without shame, and where it's just a shell." },
  { slug: "qr-scanner", name: "QR и штрих-код сканеры", nameEn: "QR & barcode scanners", blurb: "Где скан быстрый и ссылка видна до перехода, а где подписочная ловушка и накрутка.", blurbEn: "Where scans are fast and the link shows before you tap, and where it's a subscription trap with fake reviews." },
  { slug: "mind-mapping", name: "Карты мыслей", nameEn: "Mind mapping", blurb: "Где узлы создаются быстро и синк не теряет карту, а где урезанная мобилка.", blurbEn: "Where nodes are quick to create and sync never loses the map, and where it's a stripped-down mobile app." },
  { slug: "wallpapers-widgets", name: "Обои и виджеты", nameEn: "Wallpapers & widgets", blurb: "Где виджеты работают и контент свежий, а где реклама на каждый тап и накрутка.", blurbEn: "Where widgets actually work and content stays fresh, and where it's an ad on every tap with fake reviews." },
  { slug: "water-hydration", name: "Трекеры воды", nameEn: "Water & hydration", blurb: "Где напоминание не глохнет и отметка в один тап, а где реклама и накрутка.", blurbEn: "Where the reminder never dies and logging is one tap, and where it's ads and fake reviews." },
  { slug: "pet-care", name: "Уход за питомцами", nameEn: "Pet care", blurb: "Где лог здоровья и напоминания о лекарствах надёжны, а где куцые ветзаписи и сломанный семейный синк.", blurbEn: "Where the health log and med reminders are reliable, and where vet records are thin and family sync is broken." },
  { slug: "password-manager", name: "Менеджеры паролей", nameEn: "Password managers", blurb: "47 приложений: где перенос на новый телефон и автозаполнение надёжны, а где скам-аутентификаторы и накрутка.", blurbEn: "47 apps: where moving to a new phone and autofill are reliable, and where it's scam authenticators with fake reviews." },
  { slug: "ai-image-generation", name: "ИИ-генерация картинок", nameEn: "AI image generation", blurb: "61 приложение: где генерация правда слушает промпт и аватар похож на тебя, а где накрутка и bait-and-switch (43 из 61 накручены).", blurbEn: "61 apps: where generation truly follows the prompt and the avatar looks like you, and where it's fake reviews and bait-and-switch (43 of 61 are juiced)." },
  { slug: "car-maintenance", name: "Уход за авто", nameEn: "Car maintenance", blurb: "36 приложений: где автозапись поездок не теряет смену и напоминания о ТО срабатывают, а где данные исчезают при смене телефона.", blurbEn: "36 apps: where trip auto-logging never drops a shift and service reminders fire, and where data vanishes when you switch phones." },
  { slug: "wardrobe-outfit", name: "Гардероб и образы", nameEn: "Wardrobe & outfits", blurb: "28 приложений: где каталог собирается быстро и подбор идёт из твоих вещей, а где ИИ-стилист зациклен на 3 вещах и списывает без спроса.", blurbEn: "28 apps: where the catalog builds fast and outfits come from your own clothes, and where the AI stylist loops on 3 items and charges without asking." },
  { slug: "meal-prep-grocery", name: "Меню и списки покупок", nameEn: "Meal planning & grocery", blurb: "44 приложения: где рецепт превращается в список и синк с семьёй держится в магазине, а где синхронизация рвётся и теряет позиции.", blurbEn: "44 apps: where a recipe becomes a list and family sync holds up in the store, and where sync breaks and drops items." },
  { slug: "astronomy-stargazing", name: "Звёздное небо и астрономия", nameEn: "Stargazing & astronomy", blurb: "52 приложения: где наведи-и-узнай честно находит звезду по камере, а где красивый планетарий без точности и с подпиской.", blurbEn: "52 apps: where point-and-know honestly finds the star through the camera, and where it's a pretty planetarium with no accuracy and a subscription." },
  { slug: "cycling", name: "Велоспорт и велотрекеры", nameEn: "Cycling & bike trackers", blurb: "55 приложений: где трек допишется до конца и маршрут не выведет на шоссе, а где цифры врут и прокладка опасна.", blurbEn: "55 apps: where the track finishes and the route won't dump you on a highway, and where the numbers lie and the routing is dangerous." },
  { slug: "interior-design", name: "Дизайн интерьера и планировка", nameEn: "Interior design & planning", blurb: "58 приложений: где комнату видно в новом виде до трат на ремонт, а где AI не слушает правки и берёт деньги за твой же план.", blurbEn: "58 apps: where you see the room redone before spending on the remodel, and where the AI ignores your edits and charges for your own plan." },
  { slug: "fishing", name: "Рыбалка", nameEn: "Fishing", blurb: "40 приложений: где прогноз клёва совпадает с водой и карта работает без связи, а где главную функцию прячут за подписку обновлением.", blurbEn: "40 apps: where the bite forecast matches the water and the map works offline, and where an update hides the core feature behind a subscription." },
  { slug: "couples-relationship", name: "Приложения для пар", nameEn: "Couples & relationships", blurb: "35 приложений: где ежедневный ритуал держит пару и связь между телефонами надёжна, а где контент кончается и синхрон рвётся.", blurbEn: "35 apps: where a daily ritual keeps the couple close and the link between phones holds, and where the content runs out and sync breaks." },
  { slug: "hiking-trails", name: "Хайкинг и тропы", nameEn: "Hiking & trails", blurb: "25 приложений: где скачанная карта честно работает без связи и не даёт заблудиться, а где падает на тропе и жрёт батарею.", blurbEn: "25 apps: where the downloaded map honestly works offline and keeps you from getting lost, and where it crashes on the trail and drains the battery." },
  { slug: "teleprompter-captions", name: "Телесуфлёр и субтитры", nameEn: "Teleprompter & captions", blurb: "39 приложений: где прокрутка идёт за голосом и субтитры точны, а где скрипт застревает и экспорт лепит водяной знак.", blurbEn: "39 apps: where the scroll follows your voice and the captions are accurate, and where the script freezes and the export slaps on a watermark." },
];
const NICHES = byNicheMoney(NICHES_RAW, (n) => n.slug);

export default async function RatingIndexPage() {
  const locale = await getLocale();
  const ru = locale !== "en";
  const lp = ru ? "/ru" : "/en";
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "CollectionPage", name: ru ? "Народный рейтинг приложений" : "People\u2019s app rating", url: `https://inapp.pro${lp}/rating`, inLanguage: ru ? "ru" : "en", isPartOf: { "@id": "https://inapp.pro/#website" } },
      { "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: ru ? "Главная" : "Home", item: `https://inapp.pro${lp}` },
        { "@type": "ListItem", position: 2, name: ru ? "Рейтинг" : "Ratings", item: `https://inapp.pro${lp}/rating` } ] },
      { "@type": "ItemList", name: ru ? "Ниши народного рейтинга" : "People\u2019s rating niches", numberOfItems: NICHES.length,
        itemListElement: NICHES.map((n, i) => ({ "@type": "ListItem", position: i + 1, name: ru ? n.name : n.nameEn, url: `https://inapp.pro${lp}/rating/${n.slug}` })) },
    ],
  };

  return (
    <main className="mx-auto w-full max-w-[1080px] px-4 pb-24 pt-16 sm:pt-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="text-center">
        <h1 className="text-display text-balance text-[var(--color-text-primary)]">
          {ru ? "Рейтинг приложений" : "App ratings"}
        </h1>
        <p className="mx-auto mt-5 max-w-[54ch] text-lead text-pretty text-[var(--color-text-secondary)]">
          {ru
            ? "100 приложений на нишу, оценённых по реальному качеству из отзывов, а не по витринной звезде. Плюс проверка, у кого рейтинг накручен."
            : "100 apps per niche scored by real quality from reviews, not the storefront star. Plus a check on whose rating is gamed."}
        </p>
      </header>

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {NICHES.map((n) => {
          const icons = iconsFor(n.slug);
          const count = RATING[n.slug]?.count ?? 0;
          return (
            <Link key={n.slug} href={`${lp}/rating/${n.slug}`} className="card-min group flex h-full flex-col rounded-[22px] p-6">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-headline text-[var(--color-text-primary)]">{ru ? n.name : n.nameEn}</h2>
                {NEW_NICHES.has(n.slug) && (
                  <span className="mt-0.5 shrink-0 rounded-full bg-[var(--color-accent-brand)] px-2 py-0.5 text-caption font-semibold lowercase text-white">
                    {ru ? "новое" : "new"}
                  </span>
                )}
              </div>
              {icons.length > 0 && (
                <div className="mt-4 flex items-center gap-1.5">
                  {icons.map((src, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={src} alt="" loading="lazy" decoding="async" className="size-8 rounded-[10px] object-cover ring-1 ring-[var(--color-border-subtle)]" />
                  ))}
                </div>
              )}
              <p className="mt-4 line-clamp-2 text-callout text-[var(--color-text-secondary)]">{ru ? n.blurb : n.blurbEn}</p>
              <div className="mt-auto flex items-center justify-between pt-5">
                {count > 0
                  ? <p className="text-caption tabular-nums text-[var(--color-text-tertiary)]">{count} {appsWord(count, ru)}</p>
                  : <span />}
                <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true" className="shrink-0 text-[var(--color-text-tertiary)] transition-transform duration-300 group-hover:translate-x-1"><path d="M6 4l5 5-5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
