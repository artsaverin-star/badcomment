import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getLocale } from "@/lib/i18n.server";
import { tg } from "@/lib/typo";
import AtmosphereSetter from "@/components/AtmosphereSetter";
import RatingShots from "@/components/RatingShots";
import { RATING_BY_SLUG } from "@/data/peoplesRating";

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

const SETS = RATING_BY_SLUG as unknown as Record<string, RatingSet>;

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
      <div className="text-footnote text-[var(--color-text-tertiary)]">{label}</div>
      <p className="mt-1 max-w-[60ch] text-callout text-pretty text-[var(--color-text-secondary)]">{children}</p>
    </div>
  );

  return (
    <main className="relative mx-auto w-full max-w-2xl overflow-x-clip px-4 pb-16 pt-6">
      <AtmosphereSetter random />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <Link href={`/${ru ? "ru" : "en"}`} className="card-min inline-flex items-center gap-1.5 rounded-full py-2 pl-3 pr-4 text-footnote font-medium text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M10 3.25 5.25 8 10 12.75" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        {ru ? "На главную" : "Home"}
      </Link>

      <header className="mt-12">
        <div className="text-footnote text-[var(--color-text-tertiary)]">{ru ? "Народный рейтинг" : "People's rating"}</div>
        <h1 className="glow-sweep mt-6 text-display text-[var(--color-text-primary)] text-balance">
          {ru ? `Лучшие приложения для ${set.seoName ?? name.toLowerCase()}` : `Best ${name.toLowerCase()} apps`}
        </h1>
        <p className="mt-8 max-w-[58ch] text-lead text-pretty text-[var(--color-text-secondary)]">
          {ru
            ? <>Топ-{set.count} по {nf(set.totalReviews)} реальным отзывам. Оценили качество самого продукта, а не витринную звезду, которую накручивают.</>
            : <>Top {set.count} by {nf(set.totalReviews)} real reviews. We scored the product itself, not the storefront star that gets gamed.</>}
        </p>

        <div className="mt-14 flex flex-wrap gap-x-12 gap-y-8">
          {stats.map((s, i) => (
            <div key={i} className="flex flex-col">
              <span className="glow-sweep text-stat tabular-nums text-[var(--color-text-primary)]">{s.n}</span>
              <span className="mt-3 text-footnote text-[var(--color-text-tertiary)]">{s.l}</span>
            </div>
          ))}
        </div>

        <div className="card-min mt-12 rounded-[22px] p-6">
          <div className="text-caption text-[var(--color-text-tertiary)]">{ru ? "Как считаем" : "How we score"}</div>
          <p className="mt-2 max-w-[64ch] text-callout text-[var(--color-text-secondary)]">
            {ru
              ? "Читаем до 500 реальных отзывов на каждое приложение и оцениваем качество самого продукта. Смотрим на точность, глубину, авторские тексты против общей ИИ-воды. Жалобы на цену и баги игнорируем как шум. Подлинность звезды это сверка витринного рейтинга с тем, что люди пишут на деле."
              : "We read up to 500 real reviews per app and rate the product itself. We look at accuracy, depth and original writing versus generic AI filler. Price and bug complaints we ignore as noise. Star authenticity compares the storefront rating with what people actually write."}
          </p>
        </div>
      </header>

      <ol className="mt-12 flex flex-col gap-4">
        {set.apps.map((a, i) => {
          const av = authVerdict(a.authenticity, ru);
          // On EN, prefer the translated overlay; fall back to RU if missing.
          const tx = (k: "verdict" | "loved" | "weak" | "whoFor" | "authNote") => (ru ? a[k] : a.en?.[k] ?? a[k]) ?? "";
          return (
            <li key={a.id} className="card-min rounded-[22px] p-6 sm:p-7">
              <div className="flex items-center gap-3.5">
                {a.icon
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={a.icon} alt="" loading="lazy" decoding="async" className="size-14 shrink-0 rounded-[14px] object-cover" />
                  : <span className="size-14 shrink-0 rounded-[14px] bg-[var(--color-bg-muted)]" />}
                <div className="min-w-0 flex-1">
                  <h2 className="text-headline text-[var(--color-text-primary)]">{a.title}</h2>
                  <div className="mt-1 text-footnote text-[var(--color-text-tertiary)]">
                    <span className="tabular-nums">№{i + 1}</span>
                    {" · "}<span className="tabular-nums">{a.storeAvg?.toFixed(1) ?? "—"}★</span> {ru ? "в сторе" : "in store"}
                    {" · "}<span style={{ color: av.fg }}>{av.word.toLowerCase()}</span>
                    {" · "}<span className="tabular-nums">{nf(a.ratings)}</span> {ru ? "оценок" : "ratings"}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <span className="block text-title3 font-bold tabular-nums text-[var(--color-text-primary)]">{a.realScore ?? "—"}</span>
                  <span className="block text-caption text-[var(--color-text-tertiary)]">{ru ? "наш балл" : "our score"}</span>
                </div>
              </div>

              <p className="mt-4 max-w-[62ch] text-callout text-pretty text-[var(--color-text-secondary)]">{tg(tx("verdict"))}</p>

              {a.shots && a.shots.length > 0 && <RatingShots shots={a.shots} title={a.title} />}

              <div className="mt-5 flex flex-col gap-3.5 border-t border-[var(--color-border-subtle)] pt-4">
                <Field label={ru ? "Сильное" : "Strong"}>{tg(tx("loved"))}</Field>
                <Field label={ru ? "Слабое" : "Weak"}>{tg(tx("weak"))}</Field>
                {tx("whoFor") && <Field label={ru ? "Кому" : "For"}>{tg(tx("whoFor"))}</Field>}
              </div>
            </li>
          );
        })}
      </ol>

      <Link href={`/${ru ? "ru" : "en"}/segment/${slug}`} className="card-min group mt-6 block rounded-[22px] p-6 sm:p-7">
        <div className="text-caption text-[var(--color-text-tertiary)]">{ru ? "Чего не хватает всем по отзывам" : "What they all miss"}</div>
        <p className="mt-2 max-w-[40ch] text-title3 text-[var(--color-text-primary)]">
          {ru ? <>Разбор категории и идеи под подтверждённый спрос <span className="inline-block text-[var(--color-text-tertiary)] transition-transform group-hover:translate-x-1">→</span></> : <>The category breakdown and ideas backed by proven demand <span className="inline-block text-[var(--color-text-tertiary)] transition-transform group-hover:translate-x-1">→</span></>}
        </p>
      </Link>
    </main>
  );
}
