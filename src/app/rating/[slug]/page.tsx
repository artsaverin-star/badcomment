import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale } from "@/lib/i18n.server";
import { tg } from "@/lib/typo";
import AtmosphereSetter from "@/components/AtmosphereSetter";
import astrology from "@/data/peoplesRating/astrology.json";

export const dynamic = "force-dynamic";

// "Народный рейтинг" — a consumer people's ranking built from real reviews, NOT
// the storefront star (which is inflated/gamed). Our edge: we read the reviews
// and rank by the actual sentiment + give an honest verdict, loved/hated, who
// it's for, and a warning flag. One viral category (astrology) as the pilot.

type App = {
  id: string; title: string; icon: string; storeScore: number | null;
  ratings: number; reviewScore: number | null; reviewsRead: number;
  verdict: string; loved: string; hated: string; whoFor: string; flag: string | null;
};
type RatingSet = { slug: string; name: string; nameEn: string; apps: App[]; totalReviews: number; count: number };

const SETS: Record<string, RatingSet> = { astrology: astrology as RatingSet };

function scoreColor(s: number | null): string {
  if (s == null) return "var(--color-text-tertiary)";
  if (s >= 70) return "#34d399"; // emerald
  if (s >= 50) return "#fbbf24"; // amber
  return "#fb7185"; // rose
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
  const title = ru ? `Лучшие приложения: ${name} — народный рейтинг по отзывам` : `Best ${name} apps — people's rating from reviews`;
  const description = ru
    ? `${set.count} приложений «${name}» по ${set.totalReviews.toLocaleString("ru-RU")} реальным отзывам. Оценка по свежим отзывам, а не по витринной звезде: честный вердикт, за что любят и на что злятся.`
    : `${set.count} ${name} apps ranked by ${set.totalReviews.toLocaleString("en-US")} real reviews. Scored by recent reviews, not the inflated store star: an honest verdict, what users love and hate.`;
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

  // Hook: how many apps the store rates 4.5★+ but recent reviews score under 50.
  const inflated = set.apps.filter((a) => (a.storeScore ?? 0) >= 4.5 && (a.reviewScore ?? 100) < 50).length;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: ru ? `Народный рейтинг: ${name}` : `People's rating: ${name}`,
    numberOfItems: set.apps.length,
    itemListElement: set.apps.map((a, i) => ({
      "@type": "ListItem", position: i + 1,
      item: { "@type": "SoftwareApplication", name: a.title, applicationCategory: "LifestyleApplication",
        aggregateRating: a.storeScore ? { "@type": "AggregateRating", ratingValue: a.storeScore.toFixed(2), bestRating: "5", ratingCount: a.ratings } : undefined },
    })),
  };

  const medal = (i: number) => (i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`);

  return (
    <main className="relative mx-auto w-full max-w-3xl overflow-x-clip px-2 sm:px-4 pb-12 pt-6">
      <AtmosphereSetter random />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="mb-5 sm:mb-7">
        <p className="text-[12px] font-medium text-[var(--color-text-tertiary)]">{ru ? "Народный рейтинг" : "People's rating"}</p>
        <h1 className="mt-1 text-[clamp(26px,6.5vw,42px)] font-black leading-[1.04] tracking-[-0.035em] text-[var(--color-text-primary)] text-balance">
          {ru ? `Лучшие приложения: ${name}` : `Best ${name} apps`}
        </h1>
        <p className="mt-2.5 max-w-[58ch] text-[14px] leading-[1.5] text-[var(--color-text-secondary)] sm:text-[16px]">
          {ru
            ? <>Прочитали {nf(set.totalReviews)} реальных отзывов на {set.count} приложений и оценили <span className="text-[var(--color-text-primary)]">по свежим отзывам, а не по витринной звезде</span>, которую накручивают.</>
            : <>We read {nf(set.totalReviews)} real reviews of {set.count} apps and scored them <span className="text-[var(--color-text-primary)]">by recent reviews, not the inflated store star</span>.</>}
        </p>
        {inflated > 0 && (
          <p className="mt-3 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] px-3 py-2 text-[13px] text-[var(--color-text-secondary)]">
            {ru
              ? <>⚠️ У {inflated} приложений магазин рисует 4.5★+, а по свежим отзывам они набирают меньше 50 из 100.</>
              : <>⚠️ {inflated} apps show 4.5★+ in the store but score under 50/100 by recent reviews.</>}
          </p>
        )}
      </header>

      <ol className="flex flex-col gap-3">
        {set.apps.map((a, i) => (
          <li key={a.id} className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-3.5 sm:p-4">
            <div className="flex items-start gap-3">
              <div className="flex w-7 shrink-0 justify-center pt-0.5 text-[18px] font-black tabular-nums text-[var(--color-text-tertiary)] sm:text-[20px]">{medal(i)}</div>
              {a.icon
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={a.icon} alt="" width={48} height={48} className="h-11 w-11 shrink-0 rounded-[12px] sm:h-12 sm:w-12" />
                : <div className="h-11 w-11 shrink-0 rounded-[12px] bg-[var(--color-surface-card-subtle)] sm:h-12 sm:w-12" />}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="min-w-0 text-[16px] font-bold leading-[1.2] tracking-[-0.01em] text-[var(--color-text-primary)] sm:text-[18px]">{a.title}</h2>
                  <div className="shrink-0 text-right">
                    <div className="text-[19px] font-black leading-none tabular-nums sm:text-[22px]" style={{ color: scoreColor(a.reviewScore) }}>{a.reviewScore ?? "—"}<span className="text-[11px] font-semibold text-[var(--color-text-tertiary)]">/100</span></div>
                    <div className="mt-0.5 text-[10.5px] text-[var(--color-text-tertiary)]">{ru ? "магазин" : "store"} {a.storeScore?.toFixed(1) ?? "—"}★</div>
                  </div>
                </div>
                <p className="mt-0.5 text-[10.5px] text-[var(--color-text-tertiary)]">{nf(a.ratings)} {ru ? "оценок · прочитали" : "ratings · read"} {a.reviewsRead} {ru ? "отзывов" : "reviews"}</p>
                {a.flag && (
                  <span className="mt-1.5 inline-block rounded-md bg-rose-500/12 px-1.5 py-0.5 text-[11px] font-semibold text-rose-400">⚠️ {a.flag}</span>
                )}
                <p className="mt-1.5 text-[13.5px] font-medium leading-[1.4] text-[var(--color-text-primary)]">{tg(a.verdict)}</p>
                <div className="mt-2 flex flex-col gap-1 text-[12.5px] leading-[1.4]">
                  <p className="text-[var(--color-text-secondary)]"><span className="font-semibold text-emerald-500">{ru ? "Любят:" : "Loved:"}</span> {tg(a.loved)}</p>
                  <p className="text-[var(--color-text-secondary)]"><span className="font-semibold text-rose-500">{ru ? "Бесит:" : "Annoys:"}</span> {tg(a.hated)}</p>
                  <p className="text-[var(--color-text-tertiary)]"><span className="font-semibold">{ru ? "Кому:" : "For:"}</span> {tg(a.whoFor)}</p>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ol>

      <p className="mt-6 text-[11px] leading-[1.5] text-[var(--color-text-tertiary)]">
        {ru
          ? "Как считаем: читаем свежие и самые полезные реальные отзывы из App Store по каждому приложению и оцениваем по реальному тону отзывов, а не по витринной звезде (её часто накручивают). Вердикт и «любят/бесит» — из слов самих пользователей."
          : "Method: we read the most recent and most helpful real App Store reviews per app and score by the actual tone of the reviews, not the storefront star (which is often gamed). The verdict and \"loved/annoys\" come from users' own words."}
      </p>
    </main>
  );
}
