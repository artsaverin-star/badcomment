import { notFound } from "next/navigation";
import Link from "next/link";
import { getCategoryBySlug } from "@/lib/researchCategories";
import { hasInsight } from "@/lib/readyApps";
import { isActiveCategory } from "@/lib/categoryVisibility";
import { getLocale } from "@/lib/i18n.server";
import { ideaContentEn } from "@/lib/regenCards";
import { getSegmentSummary, type SegmentSummaryEvidence } from "@/lib/segmentSummary";
import { listIdeas } from "@/lib/ideas";
import CardCarousel, { type Slide, type Tone } from "@/components/CardCarousel";

export const dynamic = "force-dynamic";

// Experiment: the whole category as one narrative deck. Built from the authored
// editorial sections (segment-insights) — each section is a chapter (divider +
// its observation cards), then a final "what to build" chapter of ideas. Tells
// a story rather than shuffling cards. Same data as /segment/<slug>.

function toneOfEv(ev: SegmentSummaryEvidence[]): Tone {
  if (!ev.length) return "info";
  const a = ev.reduce((s, e) => s + (e.rating || 0), 0) / ev.length;
  return a >= 3.6 ? "up" : a <= 2.7 ? "down" : "mixed";
}
const elen = (e: SegmentSummaryEvidence) => (e.quote?.length ?? 0);
const evQuote = (e: SegmentSummaryEvidence, ru: boolean) => ({ app: e.app, rating: e.rating, date: e.date, text: ru ? e.quoteRu ?? e.quote : e.quote });
function orderEv(ev: SegmentSummaryEvidence[], tone: Tone, ru: boolean) {
  const pool = [...ev];
  if (tone === "down") pool.sort((a, b) => a.rating - b.rating || elen(b) - elen(a));
  else if (tone === "up") pool.sort((a, b) => b.rating - a.rating || elen(b) - elen(a));
  return pool.map((e) => evQuote(e, ru));
}

// Narrative arc: hold → retain → friction → loss. Order sections by heading.
const ARC = ["механик", "сообществ", "кризис", "прогресс", "истор"];
function arcRank(heading: string): number {
  const h = heading.toLowerCase();
  const i = ARC.findIndex((k) => h.includes(k));
  return i === -1 ? ARC.length : i;
}

export default async function SegmentDeckTest({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = await getLocale();
  const ru = locale !== "en";

  if (!isActiveCategory(slug)) notFound();
  const cat = getCategoryBySlug(slug, locale);
  if (!cat) notFound();
  const summary = getSegmentSummary(slug);
  if (!summary) notFound();

  const ideas = listIdeas().filter((i) => i.category === slug);
  const readyCount = cat.apps.filter((a) => hasInsight(a.productId)).length;
  const sections = [...summary.sections].sort((a, b) => arcRank(a.heading) - arcRank(b.heading));
  const totalChapters = sections.length + (ideas.length ? 1 : 0);

  const deck: Slide[] = [];

  sections.forEach((sec, ci) => {
    deck.push({ kind: "chapter", index: ci + 1, total: totalChapters, heading: sec.heading, dek: sec.dek });
    for (const item of sec.items) {
      const tone = toneOfEv(item.evidence);
      const ordered = orderEv(item.evidence, tone, ru);
      deck.push({
        kind: "insight",
        title: item.title,
        body: item.body,
        count: item.observationCount,
        tone,
        quote: ordered[0],
        evidence: ordered,
      });
    }
  });

  if (ideas.length) {
    deck.push({
      kind: "chapter",
      index: totalChapters,
      total: totalChapters,
      heading: ru ? "Что из этого можно построить" : "What you could build from this",
      dek: ru
        ? "Те же боли и опоры, но с другой стороны: продукты, которые закрывают разрывы категории."
        : "The same pains and anchors, flipped: products that close the category's gaps.",
    });
    for (const idea of ideas) {
      const en = ideaContentEn(idea.slug, locale);
      deck.push({
        kind: "idea",
        title: en?.title || idea.title,
        oneLiner: en?.oneLiner || idea.oneLiner,
        pitch: en?.pitch || idea.idea.pitch,
        features: en?.features?.length ? en.features : idea.idea.features,
        apps: idea.stats.apps,
        observations: idea.stats.observations,
        evidence: idea.reviewGrid.map((q) => ({ app: q.app, rating: q.rating, date: "", text: q.quote })),
      });
    }
  }

  const slides: Slide[] = [
    {
      kind: "cover",
      name: cat.name,
      icon: null,
      description: ru ? `Разбор ${readyCount} приложений — по 500 последних отзывов в каждом` : `${readyCount} apps — 500 latest reviews each`,
      reviewsScanned: summary.reviewsScanned,
      observations: summary.items.reduce((s, i) => s + i.observationCount, 0),
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
        {ru ? "История категории в карточках — от того, что держит, к тому, что построить" : "The category's story in cards — from what holds to what to build"}
      </p>

      <CardCarousel slides={slides} locale={ru ? "ru" : "en"} />
    </main>
  );
}
