import { notFound } from "next/navigation";
import Link from "next/link";
import { getProductInsights } from "@/lib/insights";
import { getProductIdBySlug } from "@/lib/appSlugs";
import { isPublishable } from "@/lib/readyApps";
import { getAppMetaByProductId } from "@/lib/researchCategories";
import { getProductDetail } from "@/lib/queries";
import { appCardsFor, descriptionFor } from "@/lib/regenCards";
import { getLocale } from "@/lib/i18n.server";
import CardCarousel, { type Slide, type Tone } from "@/components/CardCarousel";
import type { RegenCard } from "@/lib/regenCards";
import type { Evidence } from "@/components/InsightCard";

export const dynamic = "force-dynamic";

// Experiment: the per-app review breakdown reframed as a social-media style
// swipeable card deck. Same data as /<slug>, presented as story frames.

// Tone comes from the authored polarity (plus / minus), NOT the average star
// rating of the evidence — the tagged reviews are noisy (a complaint card can
// still carry generic 5★ quotes), so stars would mislabel a clear gripe as
// "loved".
function toneOf(c: RegenCard): Tone {
  const hasPlus = !!c.plus?.trim();
  const hasMinus = !!c.minus?.trim();
  if (hasPlus && hasMinus) return "mixed";
  if (hasPlus) return "up";
  if (hasMinus) return "down";
  return "info";
}

const qlen = (e: Evidence) => (e.quote?.length ?? 0);

const toQuote = (e: Evidence, ru: boolean) => ({
  app: e.app,
  rating: e.rating,
  date: e.date,
  text: ru ? e.quoteRu ?? e.quote : e.quote,
});

// Pick a quote that actually matches the card's tone: for a complaint, the
// lowest-rated (most likely the real gripe) and most specific; for praise, the
// highest-rated and most specific. Avoids stapling a 5★ "Extremely productive"
// onto a card about a broken widget.
function pickQuote(ev: Evidence[], tone: Tone, ru: boolean) {
  if (!ev.length) return undefined;
  const pool = [...ev];
  if (tone === "down") pool.sort((a, b) => a.rating - b.rating || qlen(b) - qlen(a));
  else if (tone === "up") pool.sort((a, b) => b.rating - a.rating || qlen(b) - qlen(a));
  else pool.sort((a, b) => qlen(b) - qlen(a));
  return toQuote(pool[0], ru);
}

// Order the full review list to match the card's tone (the gripe / the praise
// first), so the opened modal reads coherently with the slide.
function orderedEvidence(ev: Evidence[], tone: Tone, ru: boolean) {
  const pool = [...ev];
  if (tone === "down") pool.sort((a, b) => a.rating - b.rating || qlen(b) - qlen(a));
  else if (tone === "up") pool.sort((a, b) => b.rating - a.rating || qlen(b) - qlen(a));
  return pool.map((e) => toQuote(e, ru));
}

// Weave screenshot slides between the text cards so the deck alternates
// text → screenshot → text instead of a wall of text or a photo dump.
function weave(cards: Slide[], shots: Slide[]): Slide[] {
  if (shots.length === 0) return cards;
  const step = Math.max(2, Math.floor(cards.length / shots.length));
  const out: Slide[] = [];
  let si = 0;
  cards.forEach((c, i) => {
    out.push(c);
    if (si < shots.length && (i + 1) % step === 0) out.push(shots[si++]);
  });
  while (si < shots.length) out.push(shots[si++]);
  return out;
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
  const screenshots = detail?.screenshots ?? meta?.screenshots ?? [];
  const description = descriptionFor(id, locale, insights.description)?.trim();

  const slides: Slide[] = [
    {
      kind: "cover",
      name,
      icon,
      developer,
      description,
      reviewsScanned: insights.reviewsScanned,
      observations,
      avgRating,
      ratingCount,
    },
    {
      kind: "stats",
      title: ru ? "Распределение оценок" : "Rating distribution",
      hist: insights.ratingBreakdown,
      avg: avgRating,
      ratingCount,
    },
    ...weave(
      product.map((c, i) => {
        const tone = toneOf(c);
        return {
          kind: "insight" as const,
          kicker: c.kicker,
          title: c.title,
          plus: c.plus || undefined,
          minus: c.minus || undefined,
          count: c.count,
          tone,
          quote: pickQuote(c.evidence, tone, ru),
          evidence: orderedEvidence(c.evidence, tone, ru),
          pos: i + 1,
          ofTotal: product.length,
        };
      }),
      screenshots.map((src) => ({ kind: "shot" as const, image: src, name })),
    ),
  ];

  return (
    <main className="mx-auto w-full max-w-2xl px-2 sm:px-4 py-10 sm:py-14">
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
        <span className="text-caption tracking-wide text-[var(--color-text-tertiary)]">{ru ? "тест" : "test"}</span>
      </div>

      <h1 className="mb-1 text-center text-[26px] font-bold tracking-[-0.01em] text-[var(--color-text-primary)]">{name}</h1>
      <p className="mb-8 text-center text-callout text-[var(--color-text-secondary)]">
        {ru ? "Разбор отзывов в карточках — листайте вправо" : "Review breakdown in cards — swipe right"}
      </p>

      <CardCarousel slides={slides} locale={ru ? "ru" : "en"} />
    </main>
  );
}
