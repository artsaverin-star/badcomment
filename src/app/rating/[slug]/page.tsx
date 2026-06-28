import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getLocale } from "@/lib/i18n.server";
import { tg } from "@/lib/typo";
import AtmosphereSetter from "@/components/AtmosphereSetter";
import RatingAuthBadge from "@/components/RatingAuthBadge";
import RatingShots from "@/components/RatingShots";
import astrology from "@/data/peoplesRating/astrology.json";
import datingApps from "@/data/peoplesRating/dating-apps.json";
import aiPhoto from "@/data/peoplesRating/ai-avatars-headshots.json";
import meditation from "@/data/peoplesRating/meditation-mindfulness.json";
import photoEditing from "@/data/peoplesRating/photo-editing.json";
import notesPkm from "@/data/peoplesRating/notes-pkm.json";
import languageLearning from "@/data/peoplesRating/language-learning.json";
import periodCycle from "@/data/peoplesRating/period-cycle.json";
import habitTracking from "@/data/peoplesRating/habit-tracking.json";
import personalFinance from "@/data/peoplesRating/personal-finance.json";
import calendarsTasks from "@/data/peoplesRating/calendars-tasks.json";
import nutritionCalories from "@/data/peoplesRating/nutrition-calories.json";

export const dynamic = "force-dynamic";

// "Народный рейтинг" — a consumer ranking from real reviews, not the storefront
// star (inflated/gamed). Built to read as a continuation of the category page:
// same hero scale, same editorial typography, restrained colour.

type App = {
  id: string; title: string; icon: string;
  storeAvg: number | null; ratings: number; pct5: number | null; textAvg: number | null; nrev: number;
  realScore: number | null; authenticity: string | null; authNote: string | null;
  verdict: string; loved: string; weak: string; whoFor: string | null;
  shots?: string[];
  en?: { verdict?: string; loved?: string; weak?: string; whoFor?: string; authNote?: string };
};
type RatingSet = { slug: string; name: string; nameEn: string; seoName?: string; apps: App[]; totalReviews: number; count: number; inflated: number };

const SETS: Record<string, RatingSet> = { astrology: astrology as RatingSet, "dating-apps": datingApps as RatingSet, "ai-avatars-headshots": aiPhoto as RatingSet, "meditation-mindfulness": meditation as RatingSet, "photo-editing": photoEditing as RatingSet, "notes-pkm": notesPkm as RatingSet, "language-learning": languageLearning as RatingSet, "period-cycle": periodCycle as RatingSet, "habit-tracking": habitTracking as RatingSet, "personal-finance": personalFinance as RatingSet, "calendars-tasks": calendarsTasks as RatingSet, "nutrition-calories": nutritionCalories as RatingSet };

// Authenticity as a plain statement about the store star, plus a restrained tint.
function authVerdict(a: string | null, ru: boolean): { word: string; bg: string; fg: string } {
  if (a === "Накручен") return { word: ru ? "Накручена" : "Gamed", bg: "rgba(255,105,97,0.12)", fg: "#ff6961" };
  if (a === "Подлинный") return { word: ru ? "Честная" : "Genuine", bg: "rgba(48,209,88,0.12)", fg: "#30d158" };
  return { word: ru ? "Сомнительная" : "Doubtful", bg: "rgba(255,214,10,0.12)", fg: "#e0b400" };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const set = SETS[slug];
  if (!set) return {};
  const locale = await getLocale();
  const ru = locale !== "en";
  const lp = ru ? "ru" : "en";
  const url = `https://inapp.pro/${lp}/rating/${slug}`;
  const name = ru ? set.name : set.nameEn;
  const title = ru ? `Лучшие приложения для ${set.seoName ?? name.toLowerCase()}: топ-${set.count} по отзывам` : `Best ${name.toLowerCase()} apps: top ${set.count} by reviews`;
  const description = ru
    ? `${set.count} приложений «${name}» по ${set.totalReviews.toLocaleString("ru-RU")} реальным отзывам. Оценка качества по отзывам, а не по витринной звезде, плюс проверка на накрутку рейтинга.`
    : `${set.count} ${name} apps from ${set.totalReviews.toLocaleString("en-US")} real reviews. A quality score from the reviews, not the inflated store star, plus a rating-authenticity check.`;
  return {
    title, description,
    alternates: { canonical: url, languages: { ru: `https://inapp.pro/ru/rating/${slug}`, en: `https://inapp.pro/en/rating/${slug}`, "x-default": `https://inapp.pro/en/rating/${slug}` } },
    openGraph: { title, description, type: "website", url, siteName: "inApp", locale: ru ? "ru_RU" : "en_US", images: [`https://inapp.pro/api/og?l=${ru ? "ru" : "en"}`] },
    twitter: { card: "summary_large_image", title, description },
    robots: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  };
}

export default async function RatingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const set = SETS[slug];
  if (!set) notFound();
  const locale = await getLocale();
  const ru = locale !== "en";
  const nf = (n: number) => n.toLocaleString(ru ? "ru-RU" : "en-US");
  const name = ru ? set.name : set.nameEn;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: ru ? `Народный рейтинг: ${name}` : `People's rating: ${name}`,
    numberOfItems: set.apps.length,
    itemListElement: set.apps.map((a, i) => ({
      "@type": "ListItem", position: i + 1,
      item: { "@type": "SoftwareApplication", name: a.title, applicationCategory: "LifestyleApplication",
        aggregateRating: a.storeAvg ? { "@type": "AggregateRating", ratingValue: a.storeAvg.toFixed(2), bestRating: "5", ratingCount: a.ratings } : undefined },
    })),
  };

  const stats = [
    { n: nf(set.count), l: ru ? "приложений" : "apps" },
    { n: nf(set.totalReviews), l: ru ? "отзывов прочитано" : "reviews read" },
    { n: nf(set.inflated), l: ru ? "с накрученной звездой" : "with a gamed star" },
  ];

  const Field = ({ label, children }: { label: string; children: ReactNode }) => (
    <div>
      <div className="text-[13px] font-medium tracking-[0.02em] text-[var(--color-text-tertiary)]">{label}</div>
      <p className="mt-1 max-w-[60ch] text-[15px] leading-[1.6] text-pretty text-[var(--color-text-secondary)]">{children}</p>
    </div>
  );

  return (
    <main className="relative mx-auto w-full max-w-2xl overflow-x-clip px-4 pb-16 pt-6">
      <AtmosphereSetter random />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <Link href={`/${ru ? "ru" : "en"}`} className="inline-flex items-center gap-1.5 text-[13px] text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-text-secondary)]">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M10 3.25 5.25 8 10 12.75" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        {ru ? "На главную" : "Home"}
      </Link>

      <header className="mt-12">
        <div className="text-[13px] font-medium tracking-[0.02em] text-[var(--color-text-tertiary)]">{ru ? "Народный рейтинг" : "People's rating"}</div>
        <h1 className="glow-sweep mt-6 text-[clamp(30px,8vw,72px)] font-black leading-[0.98] tracking-[-0.035em] text-[var(--color-text-primary)] text-balance">
          {ru ? `Лучшие приложения для ${set.seoName ?? name.toLowerCase()}` : `Best ${name.toLowerCase()} apps`}
        </h1>
        <p className="mt-8 max-w-[58ch] text-[21px] font-light leading-[1.45] text-pretty text-[var(--color-text-secondary)] sm:text-[27px]">
          {ru
            ? <>Топ-{set.count} по {nf(set.totalReviews)} реальным отзывам. Оценили качество самого продукта, а не витринную звезду, которую накручивают.</>
            : <>Top {set.count} by {nf(set.totalReviews)} real reviews. We scored the product itself, not the storefront star that gets gamed.</>}
        </p>

        <div className="mt-14 flex flex-wrap gap-x-12 gap-y-8">
          {stats.map((s, i) => (
            <div key={i} className="flex flex-col">
              <span className="glow-sweep text-[clamp(44px,12vw,64px)] font-black leading-none tracking-[-0.045em] tabular-nums text-[var(--color-text-primary)]">{s.n}</span>
              <span className="mt-3 text-[13px] text-[var(--color-text-tertiary)]">{s.l}</span>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-[var(--color-border-subtle)] pt-6">
          <div className="text-[13px] font-medium tracking-[0.02em] text-[var(--color-text-tertiary)]">{ru ? "Как считаем" : "How we score"}</div>
          <p className="mt-3 max-w-[64ch] text-[15px] leading-[1.65] text-[var(--color-text-secondary)]">
            {ru
              ? "Читаем до 500 реальных отзывов на каждое приложение и оцениваем качество самого продукта. Смотрим на точность, глубину, авторские тексты против общей ИИ-воды. Жалобы на цену и баги игнорируем как шум. Подлинность звезды это сверка витринного рейтинга с тем, что люди пишут на деле."
              : "We read up to 500 real reviews per app and rate the product itself. We look at accuracy, depth and original writing versus generic AI filler. Price and bug complaints we ignore as noise. Star authenticity compares the storefront rating with what people actually write."}
          </p>
        </div>
      </header>

      <ol className="mt-16 flex flex-col border-t border-[var(--color-border-subtle)]">
        {set.apps.map((a, i) => {
          const av = authVerdict(a.authenticity, ru);
          // On EN, prefer the translated overlay; fall back to RU if missing.
          const tx = (k: "verdict" | "loved" | "weak" | "whoFor" | "authNote") => (ru ? a[k] : a.en?.[k] ?? a[k]) ?? "";
          return (
            <li key={a.id} className="border-b border-[var(--color-border-subtle)] py-7 sm:py-9">
              {/* Icon sits ABOVE the title so the title runs full width on mobile */}
              <div className="flex items-center gap-3">
                <span className="text-[13px] font-medium tabular-nums text-[var(--color-text-tertiary)]">{i + 1}</span>
                {a.icon
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={a.icon} alt="" loading="lazy" decoding="async" className="size-11 shrink-0 rounded-[12px] object-cover" />
                  : <div className="size-11 shrink-0 rounded-[12px] bg-[var(--color-bg-muted)]" />}
              </div>

              <h2 className="mt-3 text-[21px] font-semibold leading-[1.15] tracking-[-0.025em] text-[var(--color-text-primary)] sm:text-[26px]">{a.title}</h2>

              <p className="mt-3 max-w-[62ch] text-[17px] font-light leading-[1.5] text-pretty text-[var(--color-text-secondary)] sm:text-[19px]">{tg(tx("verdict"))}</p>

              {a.shots && a.shots.length > 0 && <RatingShots shots={a.shots} title={a.title} />}

              {/* Store + people scores, then a compact clickable authenticity chip */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <div className="rounded-[12px] border border-[var(--color-border-subtle)] px-3 py-2">
                  <div className="text-[11.5px] text-[var(--color-text-tertiary)]">{ru ? "В сторе" : "Store"}</div>
                  <div className="mt-1 text-[18px] font-semibold leading-none tabular-nums text-[var(--color-text-primary)]">{a.storeAvg?.toFixed(1) ?? "—"}★</div>
                  <div className="mt-1 text-[11px] tabular-nums text-[var(--color-text-tertiary)]">{nf(a.ratings)} {ru ? "оценок" : "ratings"}</div>
                </div>
                <div className="rounded-[12px] border border-[var(--color-border-subtle)] px-3 py-2">
                  <div className="text-[11.5px] text-[var(--color-text-tertiary)]">{ru ? "Народный" : "People's"}</div>
                  <div className="mt-1 text-[18px] font-semibold leading-none tabular-nums text-[var(--color-text-primary)]">{a.realScore ?? "—"}<span className="text-[11.5px] font-medium text-[var(--color-text-tertiary)]"> / 100</span></div>
                  <div className="mt-1 text-[11px] tabular-nums text-[var(--color-text-tertiary)]">{nf(a.nrev)} {ru ? "отзывов" : "reviews"}</div>
                </div>
                <RatingAuthBadge caption={ru ? "Честность" : "Authenticity"} label={ru ? "Звезда в сторе" : "Store star"} word={av.word} note={tg(tx("authNote"))} fg={av.fg} detailsLabel={ru ? "подробнее" : "details"} closeLabel={ru ? "Закрыть" : "Close"} />
              </div>

              <div className="mt-5 flex flex-col gap-3.5">
                <Field label={ru ? "Сильное" : "Strong"}>{tg(tx("loved"))}</Field>
                <Field label={ru ? "Слабое" : "Weak"}>{tg(tx("weak"))}</Field>
                {tx("whoFor") && <Field label={ru ? "Кому" : "For"}>{tg(tx("whoFor"))}</Field>}
              </div>
            </li>
          );
        })}
      </ol>

      <Link href={`/${ru ? "ru" : "en"}/segment/${slug}`} className="group mt-12 block border-t border-[var(--color-border-subtle)] pt-8">
        <div className="text-[13px] font-medium tracking-[0.02em] text-[var(--color-text-tertiary)]">{ru ? "Чего не хватает всем по отзывам" : "What they all miss"}</div>
        <p className="mt-2 max-w-[40ch] text-[24px] font-semibold leading-[1.15] tracking-[-0.02em] text-[var(--color-text-primary)] sm:text-[30px]">
          {ru ? <>Разбор категории и идеи под подтверждённый спрос <span className="inline-block text-[var(--color-text-tertiary)] transition-transform group-hover:translate-x-1">→</span></> : <>The category breakdown and ideas backed by proven demand <span className="inline-block text-[var(--color-text-tertiary)] transition-transform group-hover:translate-x-1">→</span></>}
        </p>
      </Link>
    </main>
  );
}
