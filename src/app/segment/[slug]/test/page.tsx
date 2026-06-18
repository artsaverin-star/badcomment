import { notFound } from "next/navigation";
import Link from "next/link";
import { getCategoryBySlug } from "@/lib/researchCategories";
import { getAppMetaByProductId } from "@/lib/researchCategories";
import { hasInsight } from "@/lib/readyApps";
import { isActiveCategory } from "@/lib/categoryVisibility";
import { getLocale } from "@/lib/i18n.server";
import { categoryCards, ideaContentEn } from "@/lib/regenCards";
import { getSegmentSummary } from "@/lib/segmentSummary";
import { listIdeas } from "@/lib/ideas";
import CardCarousel, { type Slide, type Tone } from "@/components/CardCarousel";
import type { RegenCard } from "@/lib/regenCards";
import type { Evidence } from "@/components/InsightCard";

export const dynamic = "force-dynamic";

// Experiment: the whole category as one swipeable deck — cross-app insight
// cards, the ideas they imply, and app screenshots, woven into a single read.
// No separate sections, no jumping away. Same data as /segment/<slug>.

function toneOf(c: RegenCard): Tone {
  const hasPlus = !!c.plus?.trim();
  const hasMinus = !!c.minus?.trim();
  if (hasPlus && hasMinus) return "mixed";
  if (hasPlus) return "up";
  if (hasMinus) return "down";
  return "info";
}
const qlen = (e: Evidence) => (e.quote?.length ?? 0);
const toQuote = (e: Evidence, ru: boolean) => ({ app: e.app, rating: e.rating, date: e.date, text: ru ? e.quoteRu ?? e.quote : e.quote });
function pickQuote(ev: Evidence[], tone: Tone, ru: boolean) {
  if (!ev.length) return undefined;
  const pool = [...ev];
  if (tone === "down") pool.sort((a, b) => a.rating - b.rating || qlen(b) - qlen(a));
  else if (tone === "up") pool.sort((a, b) => b.rating - a.rating || qlen(b) - qlen(a));
  else pool.sort((a, b) => qlen(b) - qlen(a));
  return toQuote(pool[0], ru);
}
function orderedEvidence(ev: Evidence[], tone: Tone, ru: boolean) {
  const pool = [...ev];
  if (tone === "down") pool.sort((a, b) => a.rating - b.rating || qlen(b) - qlen(a));
  else if (tone === "up") pool.sort((a, b) => b.rating - a.rating || qlen(b) - qlen(a));
  return pool.map((e) => toQuote(e, ru));
}

export default async function SegmentDeckTest({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = await getLocale();
  const ru = locale !== "en";

  if (!isActiveCategory(slug)) notFound();
  const cat = getCategoryBySlug(slug, locale);
  if (!cat) notFound();

  const summary = getSegmentSummary(slug);
  const cards = categoryCards(slug, locale)?.product ?? [];
  const ideas = listIdeas().filter((i) => i.category === slug);
  const readyCount = cat.apps.filter((a) => hasInsight(a.productId)).length;
  const reviews = summary?.reviewsScanned ?? readyCount * 500;
  const observations = cards.reduce((s, c) => s + c.count, 0);

  // One screenshot per app (those that have them) → standalone shot slides.
  const shots: Slide[] = [];
  for (const a of cat.apps) {
    const meta = a.productId ? getAppMetaByProductId(a.productId) : null;
    const src = meta?.screenshots?.[0];
    if (src) shots.push({ kind: "shot", image: src, name: a.name });
  }

  const insightSlides: Slide[] = cards.map((c) => {
    const tone = toneOf(c);
    return {
      kind: "insight",
      kicker: c.kicker,
      title: c.title,
      plus: c.plus || undefined,
      minus: c.minus || undefined,
      count: c.count,
      tone,
      quote: pickQuote(c.evidence, tone, ru),
      evidence: orderedEvidence(c.evidence, tone, ru),
    };
  });

  const ideaSlides: Slide[] = ideas.map((idea) => {
    const en = ideaContentEn(idea.slug, locale);
    return {
      kind: "idea",
      title: en?.title || idea.title,
      oneLiner: en?.oneLiner || idea.oneLiner,
      pitch: en?.pitch || idea.idea.pitch,
      features: en?.features?.length ? en.features : idea.idea.features,
      apps: idea.stats.apps,
      observations: idea.stats.observations,
      evidence: idea.reviewGrid.map((q) => ({ app: q.app, rating: q.rating, date: "", text: q.quote })),
    };
  });

  // Weave the three streams: an idea after every couple of insight cards, a
  // screenshot every few — so a swipe mixes разбор → идея → скрин → разбор.
  const deck: Slide[] = [];
  let ideaI = 0;
  let shotI = 0;
  insightSlides.forEach((s, i) => {
    deck.push(s);
    if (ideaI < ideaSlides.length && (i + 1) % 2 === 0) deck.push(ideaSlides[ideaI++]);
    if (shotI < shots.length && (i + 1) % 3 === 0) deck.push(shots[shotI++]);
  });
  while (ideaI < ideaSlides.length) deck.push(ideaSlides[ideaI++]);
  while (shotI < shots.length) deck.push(shots[shotI++]);

  const slides: Slide[] = [
    {
      kind: "cover",
      name: cat.name,
      icon: null,
      description: ru ? `Разбор ${readyCount} приложений — по 500 последних отзывов в каждом` : `${readyCount} apps — 500 latest reviews each`,
      reviewsScanned: reviews,
      observations: observations || cards.length,
      avgRating: null,
      ratingCount: null,
    },
    ...deck,
  ];

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-14">
      <div className="mb-6 flex items-center justify-between gap-3">
        <Link
          href={`/segment/${slug}`}
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] px-3.5 py-1.5 text-footnote font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M10 3.5 5.5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {ru ? "К категории" : "To the category"}
        </Link>
        <span className="text-caption uppercase tracking-wide text-[var(--color-text-tertiary)]">{ru ? "тест" : "test"}</span>
      </div>

      <h1 className="mb-1 text-center text-[26px] font-bold tracking-[-0.01em] text-[var(--color-text-primary)]">{cat.name}</h1>
      <p className="mb-8 text-center text-callout text-[var(--color-text-secondary)]">
        {ru ? "Вся категория в карточках — разбор и идеи, листайте вправо" : "The whole category in cards — breakdown & ideas, swipe right"}
      </p>

      <CardCarousel slides={slides} locale={ru ? "ru" : "en"} />
    </main>
  );
}
