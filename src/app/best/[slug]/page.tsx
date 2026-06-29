import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getCategoryBySlug } from "@/lib/researchCategories";
import { isActiveCategory } from "@/lib/categoryVisibility";
import { getProductInsights } from "@/lib/insights";
import { appCardsFor } from "@/lib/regenCards";
import { getSegmentSummary } from "@/lib/segmentSummary";
import { hasInsight } from "@/lib/readyApps";
import { listIdeas } from "@/lib/ideas";
import { ideaContentEn } from "@/lib/regenCards";
import { getLocale } from "@/lib/i18n.server";
import { tg } from "@/lib/typo";
import AtmosphereSetter from "@/components/AtmosphereSetter";

export const dynamic = "force-dynamic";

// --- "Народный рейтинг" — a consumer-facing ranking of a category's apps built
// from the reviews we already read. The edge over store stars: we surface WHY an
// app is loved and WHAT still annoys people, then point at the unmet gap (funnel
// into the founder/idea layer). Prototype: one route, every active category.

type Ranked = {
  name: string;
  icon: string;
  productId: string;
  avg: number;
  reviews: number;
  pct45: number; // % of 4-5★ among read reviews
  loved: string | null;
  hated: string | null;
  description: string | null;
};

function buildRanking(slug: string, locale: "ru" | "en"): Ranked[] {
  const cat = getCategoryBySlug(slug, locale);
  if (!cat) return [];
  const rows: Ranked[] = [];
  for (const a of cat.apps) {
    const pid = a.productId;
    if (!pid || !hasInsight(pid)) continue;
    const ins = getProductInsights(pid);
    if (!ins) continue;
    const hist = ins.ratingBreakdown ?? {};
    const total = [1, 2, 3, 4, 5].reduce((s, n) => s + (hist[String(n)] ?? 0), 0);
    if (total <= 0) continue;
    const avg = [1, 2, 3, 4, 5].reduce((s, n) => s + n * (hist[String(n)] ?? 0), 0) / total;
    const pct45 = ((hist["4"] ?? 0) + (hist["5"] ?? 0)) / total;
    const cards = appCardsFor(pid, locale)?.product ?? [];
    const loved = cards.filter((c) => c.plus?.trim()).sort((x, y) => y.count - x.count)[0]?.plus?.trim() ?? null;
    const hated = cards.filter((c) => c.minus?.trim()).sort((x, y) => y.count - x.count)[0]?.minus?.trim() ?? null;
    rows.push({ name: a.name, icon: a.icon, productId: pid, avg, reviews: ins.reviewsScanned ?? total, pct45, loved, hated, description: ins.description ?? null });
  }
  // People's score = share of positive sentiment among the reviews we read,
  // tie-broken by raw average. Not the raw store star (everyone has that).
  rows.sort((a, b) => b.pct45 - a.pct45 || b.avg - a.avg);
  return rows;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getLocale();
  const ru = locale !== "en";
  if (!isActiveCategory(slug)) return {};
  const cat = getCategoryBySlug(slug, ru ? "ru" : "en");
  if (!cat) return {};
  const lp = ru ? "ru" : "en";
  const url = `https://inapp.pro/${lp}/best/${slug}`;
  const title = ru ? `Лучшие приложения: ${cat.name} — по реальным отзывам` : `Best ${cat.name} apps — by real reviews`;
  const sum = getSegmentSummary(slug);
  const n = (sum?.reviewsScanned ?? 5000).toLocaleString(ru ? "ru-RU" : "en-US");
  const description = ru
    ? `Рейтинг приложений «${cat.name}» по ${n} реальным отзывам: за что любят, на что злятся и какое выбрать. Не звезда из стора, а разбор отзывов.`
    : `${cat.name} apps ranked by ${n} real reviews: what users love, what annoys them, and which to pick. Not the store star — a review teardown.`;
  return {
    title,
    description,
    alternates: { canonical: url, languages: { ru: `https://inapp.pro/ru/best/${slug}`, en: `https://inapp.pro/en/best/${slug}`, "x-default": `https://inapp.pro/en/best/${slug}` } },
    openGraph: { title, description, type: "website", url, siteName: "inApp", locale: ru ? "ru_RU" : "en_US", images: [`https://inapp.pro/api/og?l=${ru ? "ru" : "en"}`] },
    twitter: { card: "summary_large_image", title, description },
    robots: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  };
}

export default async function BestPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = await getLocale();
  const ru = locale !== "en";
  const lp = ru ? "ru" : "en";
  if (!isActiveCategory(slug)) notFound();
  const cat = getCategoryBySlug(slug, ru ? "ru" : "en");
  if (!cat) notFound();
  const ranked = buildRanking(slug, ru ? "ru" : "en");
  if (ranked.length === 0) notFound();

  const sum = getSegmentSummary(slug);
  const totalReviews = sum?.reviewsScanned ?? ranked.reduce((s, r) => s + r.reviews, 0);
  const nf = (n: number) => n.toLocaleString(ru ? "ru-RU" : "en-US");

  // Funnel: the unmet opportunity → the idea layer (paid). Top idea by demand.
  const ideas = listIdeas().filter((i) => i.category === slug).sort((a, b) => (b.stats?.observations ?? 0) - (a.stats?.observations ?? 0));
  const topIdea = ideas[0] ?? null;
  const topIdeaTitle = topIdea ? (ru ? topIdea.title : ideaContentEn(topIdea.slug, locale)?.title || topIdea.title) : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: ru ? `Лучшие приложения: ${cat.name}` : `Best ${cat.name} apps`,
    numberOfItems: ranked.length,
    itemListElement: ranked.map((r, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "SoftwareApplication",
        name: r.name,
        applicationCategory: "MobileApplication",
        aggregateRating: { "@type": "AggregateRating", ratingValue: r.avg.toFixed(2), bestRating: "5", ratingCount: r.reviews },
      },
    })),
  };

  const medal = (i: number) => (i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`);

  return (
    <main className="relative mx-auto w-full max-w-3xl overflow-x-clip px-4 pb-12 pt-6">
      <AtmosphereSetter random />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="mb-5 sm:mb-7">
        <p className="text-caption text-[var(--color-text-tertiary)]">{ru ? "Народный рейтинг" : "People's ranking"}</p>
        <h1 className="mt-1 text-display text-[var(--color-text-primary)] text-balance">
          {ru ? `Лучшие приложения: ${cat.name}` : `Best ${cat.name} apps`}
        </h1>
        <p className="mt-2.5 max-w-[56ch] text-body text-[var(--color-text-secondary)]">
          {ru
            ? <>По {nf(totalReviews)} реальным отзывам на {ranked.length} приложений. Рейтинг — не звезда из стора, а доля довольных и {" "}<span className="text-[var(--color-text-primary)]">за что любят и на что злятся</span> по словам самих пользователей.</>
            : <>From {nf(totalReviews)} real reviews of {ranked.length} apps. The rank is not the store star — it is the share of satisfied users and <span className="text-[var(--color-text-primary)]">what people love and hate</span> in their own words.</>}
        </p>
      </header>

      <ol className="flex flex-col gap-3">
        {ranked.map((r, i) => (
          <li
            key={r.productId}
            className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-3.5 sm:p-4"
          >
            <div className="flex items-start gap-3">
              <div className="flex w-7 shrink-0 justify-center pt-0.5 text-subhead tabular-nums text-[var(--color-text-tertiary)]">{medal(i)}</div>
              {r.icon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.icon} alt="" width={48} height={48} className="h-11 w-11 shrink-0 rounded-[12px] sm:h-12 sm:w-12" />
              ) : (
                <div className="h-11 w-11 shrink-0 rounded-[12px] bg-[var(--color-surface-card-subtle)] sm:h-12 sm:w-12" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <h2 className="truncate text-subhead text-[var(--color-text-primary)]">{r.name}</h2>
                  <span className="shrink-0 text-footnote tabular-nums text-[var(--color-text-secondary)]">★ {r.avg.toFixed(1)}</span>
                </div>
                <p className="mt-0.5 text-caption text-[var(--color-text-tertiary)]">
                  {ru ? `${Math.round(r.pct45 * 100)}% довольных · ${nf(r.reviews)} отзывов прочитано` : `${Math.round(r.pct45 * 100)}% satisfied · ${nf(r.reviews)} reviews read`}
                </p>
                {r.description && <p className="mt-1.5 text-caption text-[var(--color-text-secondary)]">{tg(r.description)}</p>}
                <div className="mt-2.5 flex flex-col gap-1.5">
                  {r.loved && (
                    <p className="text-footnote text-[var(--color-text-primary)]">
                      <span className="font-semibold text-emerald-500">{ru ? "Любят:" : "Loved:"}</span> {tg(r.loved)}
                    </p>
                  )}
                  {r.hated && (
                    <p className="text-footnote text-[var(--color-text-primary)]">
                      <span className="font-semibold text-rose-500">{ru ? "Бесит:" : "Annoys:"}</span> {tg(r.hated)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ol>

      {topIdeaTitle && (
        <Link
          href={`/${lp}/segment/${slug}`}
          className="group mt-6 block rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-4 sm:p-5 transition-colors hover:bg-[color-mix(in_srgb,var(--color-text-primary)_5%,var(--color-surface-card))]"
        >
          <p className="text-caption text-[var(--color-text-tertiary)]">{ru ? "Чего не хватает всем по отзывам" : "What every one of them is missing"}</p>
          <p className="mt-1 text-lead font-bold text-[var(--color-text-primary)]">{tg(topIdeaTitle)}</p>
          <p className="mt-1.5 text-footnote text-[var(--color-text-secondary)]">
            {ru ? "Разбор отзывов и идеи под подтверждённый спрос" : "Review teardown and ideas backed by proven demand"} <span className="text-[var(--color-text-tertiary)] transition-colors group-hover:text-[var(--color-text-primary)]">→</span>
          </p>
        </Link>
      )}

      <p className="mt-6 text-caption text-[var(--color-text-tertiary)]">
        {ru
          ? "Как считаем: читаем выборку реальных отзывов из App Store и Google Play по каждому приложению и ранжируем по доле довольных пользователей, а не по витринной звезде. «Любят» и «бесит» — самые частые темы из отзывов."
          : "Method: we read a sample of real App Store and Google Play reviews per app and rank by the share of satisfied users, not the storefront star. \"Loved\" and \"annoys\" are the most frequent themes from the reviews."}
      </p>
    </main>
  );
}
