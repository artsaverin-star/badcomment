import type { Metadata } from "next";
import Link from "next/link";
import { getLocale } from "@/lib/i18n.server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const ru = locale !== "en";
  const title = ru ? "Народный рейтинг приложений по реальным отзывам" : "People's app rating by real reviews";
  const description = ru
    ? "100 приложений на нишу, оценённых по реальным отзывам, а не по витринной звезде, плюс проверка на накрутку рейтинга."
    : "100 apps per niche scored by real reviews, not the storefront star, plus a rating-authenticity check.";
  return { title, description, alternates: { canonical: `https://inapp.pro/${ru ? "ru" : "en"}/rating` } };
}

const NICHES = [
  { slug: "astrology", name: "Астрология", nameEn: "Astrology", blurb: "Честная оценка и проверка на накрутку звезды." },
  { slug: "dating-apps", name: "Знакомства", nameEn: "Dating", blurb: "Где реальные люди, а где боты и накрученные звёзды." },
  { slug: "ai-avatars-headshots", name: "ИИ-фото", nameEn: "AI photo", blurb: "Где результат правда похож на тебя, а где обман в рекламе." },
  { slug: "meditation-mindfulness", name: "Медитация", nameEn: "Meditation", blurb: "Где правда успокаивает и тёплый голос, а где пустышка." },
  { slug: "photo-editing", name: "Фоторедакторы", nameEn: "Photo editors", blurb: "Где инструменты реально работают, а где портят фото." },
  { slug: "notes-pkm", name: "Заметки", nameEn: "Notes", blurb: "Где мысль пишется мгновенно и не теряется, а где тормозит." },
  { slug: "language-learning", name: "Изучение языков", nameEn: "Language learning", blurb: "Где правда доводят до речи, а где только стрики и игра." },
  { slug: "period-cycle", name: "Месячные", nameEn: "Period trackers", blurb: "Где прогноз точен и данные в безопасности, а где торгуют приватностью." },
  { slug: "habit-tracking", name: "Привычки", nameEn: "Habit trackers", blurb: "Где отметка мгновенна и напоминание приходит, а где стрик стыдит." },
  { slug: "personal-finance", name: "Личные финансы", nameEn: "Budget apps", blurb: "Где правда держишь траты под контролем, а где рвётся синхронизация." },
  { slug: "calendars-tasks", name: "Календари и задачи", nameEn: "Calendars & tasks", blurb: "Где напоминание приходит вовремя и ничего не теряется." },
  { slug: "nutrition-calories", name: "Калории и питание", nameEn: "Calorie & nutrition", blurb: "Где подсчёт калорий честный и удобный, а где база врёт и тормозит." },
  { slug: "crypto-investing", name: "Крипта и инвестиции", nameEn: "Crypto & investing apps", blurb: "93 приложения: где кошелёк и биржа честны и надёжны, а где накрутка и заморозка средств." },
  { slug: "music-streaming", name: "Музыка и стриминг", nameEn: "Music streaming apps", blurb: "94 приложения: где каталог, звук и плейлисты честны и удобны, а где накрутка и потеря музыки." },
  { slug: "video-streaming", name: "Видео и стриминг", nameEn: "Video streaming apps", blurb: "95 приложений: где каталог, плеер и синхронизация честны, а где накрутка и геоблок." },
  { slug: "food-delivery", name: "Доставка еды", nameEn: "Food delivery apps", blurb: "94 приложения: где заказ приходит точно и вовремя, а где накрутка и сломанная поддержка." },
  { slug: "messaging-apps", name: "Мессенджеры", nameEn: "Messaging apps", blurb: "94 приложения: где сообщения и звонки доходят надёжно и приватно, а где накрутка и пропавшие СМС." },
  { slug: "shopping-ecommerce", name: "Покупки и маркетплейсы", nameEn: "Shopping & ecommerce apps", blurb: "95 приложений: где товар приходит как на фото и возврат работает, а где контрафакт и фиктивная доставка." },
  { slug: "ride-hailing", name: "Такси и поездки", nameEn: "Ride-hailing apps", blurb: "87 приложений: где машина приезжает вовремя и водителю честно платят, а где накрутка и сорванный заказ." },
  { slug: "weather-apps", name: "Погода", nameEn: "Weather apps", blurb: "92 приложения: где прогноз сбывается и оповещение приходит вовремя, а где врёт радар и сыплет реклама." },
  { slug: "travel-planning", name: "Планирование путешествий", nameEn: "Travel planning apps", blurb: "90 приложений: где маршрут и брони не теряются и работают офлайн за границей, а где накрутка и сбои." },
  { slug: "sleep-tracking", name: "Сон и звуки для сна", nameEn: "Sleep tracking & sounds apps", blurb: "94 приложения: где трекинг сна точен и звуки убаюкивают, а где будильник врёт и сыплет реклама." },
  { slug: "focus-productivity", name: "Фокус и продуктивность", nameEn: "Focus & productivity timer apps", blurb: "72 приложения: где таймер работает в фоне и блокировка отвлечений держит, а где гимик и накрутка." },
  { slug: "journaling-mood", name: "Дневники и настроение", nameEn: "Journaling & mood apps", blurb: "95 приложений: где писать легко и видно динамику настроения, а где давит стрик и течёт приватность." },
  { slug: "workout-fitness", name: "Тренировки и фитнес", nameEn: "Workout & fitness apps", blurb: "91 приложение: где лог тренировки быстрый и прогрессия считается, а где накрутка и слетает история." },
];

export default async function RatingIndexPage() {
  const locale = await getLocale();
  const ru = locale !== "en";

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-24 pt-16 sm:pt-24">
      <Link href="/" className="inline-flex items-center gap-1.5 text-[13px] text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-text-secondary)]">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M10 3.25 5.25 8 10 12.75" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        {ru ? "На главную" : "Home"}
      </Link>

      <header className="mt-12">
        <div className="text-[13px] font-medium tracking-[0.02em] text-[var(--color-text-tertiary)]">{ru ? "Народный рейтинг" : "People's rating"}</div>
        <h1 className="glow-sweep mt-5 text-[clamp(32px,8vw,56px)] font-black leading-[1.0] tracking-[-0.035em] text-balance text-[var(--color-text-primary)]">
          {ru ? "Рейтинг приложений по реальным отзывам" : "App ratings by real reviews"}
        </h1>
        <p className="mt-6 max-w-[56ch] text-[17px] leading-[1.55] text-pretty text-[var(--color-text-secondary)] sm:text-[19px]">
          {ru
            ? "100 приложений на нишу, оценённых по реальному качеству из отзывов, а не по витринной звезде. Плюс проверка, у кого рейтинг накручен."
            : "100 apps per niche scored by real quality from reviews, not the storefront star. Plus a check on whose rating is gamed."}
        </p>
      </header>

      <div className="mt-12 flex flex-col divide-y divide-[var(--color-border-subtle)] border-y border-[var(--color-border-subtle)]">
        {NICHES.map((n) => (
          <Link key={n.slug} href={`/rating/${n.slug}`} className="group flex items-center gap-4 py-5 transition-colors hover:bg-[color-mix(in_srgb,var(--color-text-primary)_4%,transparent)]">
            <div className="min-w-0 flex-1">
              <h2 className="text-[20px] font-bold tracking-[-0.02em] text-[var(--color-text-primary)] sm:text-[23px]">{ru ? n.name : n.nameEn}</h2>
              {ru && <p className="mt-1 text-[14px] leading-[1.45] text-[var(--color-text-secondary)]">{n.blurb}</p>}
            </div>
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true" className="shrink-0 text-[var(--color-text-tertiary)] transition-transform duration-300 group-hover:translate-x-1"><path d="M6 4l5 5-5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </Link>
        ))}
      </div>
    </main>
  );
}
