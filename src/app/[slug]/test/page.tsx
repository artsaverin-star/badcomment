import { notFound } from "next/navigation";
import Link from "next/link";
import { getProductInsights } from "@/lib/insights";
import { getProductIdBySlug } from "@/lib/appSlugs";
import { isPublishable } from "@/lib/readyApps";
import { getAppMetaByProductId } from "@/lib/researchCategories";
import { getProductDetail } from "@/lib/queries";
import { appCardsFor } from "@/lib/regenCards";
import { getLocale } from "@/lib/i18n.server";
import CardCarousel, { type Slide } from "@/components/CardCarousel";
import type { RegenCard } from "@/lib/regenCards";
import type { Evidence } from "@/components/InsightCard";

export const dynamic = "force-dynamic";

// Experiment: the per-app review breakdown reframed as a social-media style
// swipeable card deck. Same data as /<slug>, presented as story frames.

function toneOf(ev: Evidence[]): "up" | "down" | "info" {
  const avg = ev.length ? ev.reduce((s, e) => s + (e.rating || 0), 0) / ev.length : 0;
  return avg >= 3.5 ? "up" : avg > 0 && avg <= 2.6 ? "down" : "info";
}

function pickQuote(ev: Evidence[], ru: boolean) {
  const e = ev[0];
  if (!e) return undefined;
  return { app: e.app, rating: e.rating, date: e.date, text: ru ? e.quoteRu ?? e.quote : e.quote };
}

export default async function CarouselTestPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const id = getProductIdBySlug(slug);
  if (!id) notFound();
  if (!isPublishable(id)) notFound();

  const locale = await getLocale();
  const ru = locale !== "en";

  const insights = getProductInsights(id);
  if (!insights) notFound();

  const cards = appCardsFor(id, locale);
  const detail = await getProductDetail(id, locale).catch(() => null);
  const meta = getAppMetaByProductId(id);
  const name = detail?.name ?? meta?.name ?? slug;
  const icon = detail?.icon ?? meta?.icon ?? null;
  const developer = detail?.developer ?? meta?.developer ?? undefined;

  // Rating summary from the histogram (DB detail is often absent for scraped apps).
  const histTotal = [1, 2, 3, 4, 5].reduce((s, n) => s + (insights.ratingBreakdown[String(n)] ?? 0), 0);
  const histAvg =
    histTotal > 0
      ? [1, 2, 3, 4, 5].reduce((s, n) => s + n * (insights.ratingBreakdown[String(n)] ?? 0), 0) / histTotal
      : 0;
  const avgRating = detail?.avgRating ?? (histAvg || null);
  const ratingCount = detail?.ratingCount ?? (histTotal || null);

  const product: RegenCard[] = cards?.product ?? [];
  const observations = (insights.insights ?? []).length || product.length;

  const slides: Slide[] = [
    {
      kind: "cover",
      name,
      icon,
      developer,
      reviewsScanned: insights.reviewsScanned,
      observations,
      avgRating,
      ratingCount,
    },
    ...product.map((c) => ({
      kind: "insight" as const,
      kicker: c.kicker,
      title: c.title,
      plus: c.plus || undefined,
      minus: c.minus || undefined,
      count: c.count,
      tone: toneOf(c.evidence),
      quote: pickQuote(c.evidence, ru),
    })),
  ];

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-14">
      <div className="mb-6 flex items-center justify-between gap-3">
        <Link
          href={`/${slug}`}
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] px-3.5 py-1.5 text-footnote font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M10 3.5 5.5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {ru ? "К разбору" : "To the breakdown"}
        </Link>
        <span className="text-caption uppercase tracking-wide text-[var(--color-text-tertiary)]">{ru ? "тест" : "test"}</span>
      </div>

      <h1 className="mb-1 text-center text-[26px] font-bold tracking-[-0.01em] text-[var(--color-text-primary)]">{name}</h1>
      <p className="mb-8 text-center text-callout text-[var(--color-text-secondary)]">
        {ru ? "Разбор отзывов в карточках — листайте вправо" : "Review breakdown in cards — swipe right"}
      </p>

      <CardCarousel slides={slides} locale={ru ? "ru" : "en"} />
    </main>
  );
}
