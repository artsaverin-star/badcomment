import { notFound } from "next/navigation";
import Link from "next/link";
import { getCategoryBySlug } from "@/lib/researchCategories";
import { getSlugByProductId } from "@/lib/appSlugs";
import { hasInsight } from "@/lib/readyApps";
import { isActiveCategory } from "@/lib/categoryVisibility";
import { getLocale } from "@/lib/i18n.server";
import { ideaContentEn } from "@/lib/regenCards";
import { getSegmentSummary, type SegmentSummaryEvidence } from "@/lib/segmentSummary";
import { listIdeas } from "@/lib/ideas";
import CardCarousel, { type Slide, type Tone } from "@/components/CardCarousel";

export const dynamic = "force-dynamic";

// Experiment: a full category landing. Editorial top (what inApp is + the apps
// + key 2026 takeaways) for a first-time visitor, then a narrative card deck at
// the bottom that tells the category's story chapter by chapter. Same data as
// /segment/<slug>.

type CatApp = { query: string; name: string; icon: string; productId: string | null };
type EvLike = { app?: string; rating: number; date: string; quote: string; quoteRu?: string };

function toneOfEv(ev: EvLike[]): Tone {
  if (!ev.length) return "info";
  const a = ev.reduce((s, e) => s + (e.rating || 0), 0) / ev.length;
  return a >= 3.6 ? "up" : a <= 2.7 ? "down" : "info";
}
const elen = (e: EvLike) => (e.quote?.length ?? 0);
const evQuote = (e: EvLike, ru: boolean) => ({ app: e.app, rating: e.rating, date: e.date, text: ru ? e.quoteRu ?? e.quote : e.quote });
function orderEv(ev: EvLike[], tone: Tone, ru: boolean) {
  const pool = [...ev];
  if (tone === "down") pool.sort((a, b) => a.rating - b.rating || elen(b) - elen(a));
  else if (tone === "up") pool.sort((a, b) => b.rating - a.rating || elen(b) - elen(a));
  return pool.map((e) => evQuote(e, ru));
}

// Narrative arc: what holds → retains for years → erases progress → betrays in
// crisis (the moral climax) → then the ideas.
const ARC = ["механик", "сообществ", "прогресс", "истор", "кризис"];
const arcRank = (h: string) => {
  const i = ARC.findIndex((k) => h.toLowerCase().includes(k));
  return i === -1 ? ARC.length : i;
};

function AppTile({ a }: { a: CatApp }) {
  const ready = hasInsight(a.productId);
  const linkSlug = ready && a.productId ? getSlugByProductId(a.productId) : null;
  const tile = "flex items-center gap-3 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] px-3 py-2.5";
  const inner = (
    <>
      {a.icon ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={a.icon} alt="" loading="lazy" decoding="async" className={`size-9 shrink-0 rounded-[12px] object-cover ${ready ? "" : "opacity-40 grayscale"}`} />
      ) : (
        <div className="size-9 shrink-0 rounded-[12px] bg-[var(--color-bg-muted)]" />
      )}
      <span className={`min-w-0 flex-1 truncate text-callout font-medium ${ready ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-tertiary)]"}`}>{a.name}</span>
      {linkSlug && (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0 text-[var(--color-text-tertiary)]">
          <path d="m6 4 4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </>
  );
  return linkSlug ? (
    <Link href={`/${linkSlug}`} className={`${tile} transition-colors hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-card-subtle)]`}>
      {inner}
    </Link>
  ) : (
    <div className={tile}>{inner}</div>
  );
}

export default async function SegmentLandingTest({ params }: { params: Promise<{ slug: string }> }) {
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
  const observations = summary.items.reduce((s, i) => s + i.observationCount, 0);

  // ── Build the narrative deck ───────────────────────────────────────────
  // Cover → authored narrative chapters (the category's story) → ideas chapter.
  const chapters = sections.length + (ideas.length ? 1 : 0);
  let ci = 0;
  const deck: Slide[] = [
    {
      kind: "cover",
      name: cat.name,
      icon: null,
      icons: cat.apps.map((a) => a.icon).filter(Boolean),
      description: ru ? `Разбор категории · 2026 — на основе ${readyCount} приложений` : `Category breakdown · 2026 — ${readyCount} apps`,
      reviewsScanned: summary.reviewsScanned,
      observations,
      avgRating: null,
      ratingCount: null,
    },
  ];

  sections.forEach((sec) => {
    ci += 1;
    deck.push({ kind: "chapter", index: ci, total: chapters, heading: sec.heading, dek: sec.dek });
    for (const item of sec.items) {
      const tone = toneOfEv(item.evidence as SegmentSummaryEvidence[]);
      const ordered = orderEv(item.evidence as EvLike[], tone, ru);
      deck.push({ kind: "insight", title: item.title, body: item.body, count: item.observationCount, tone, quote: ordered[0], evidence: ordered });
    }
  });

  if (ideas.length) {
    ci += 1;
    deck.push({
      kind: "chapter",
      index: ci,
      total: chapters,
      heading: ru ? "Что из этого можно построить" : "What you could build from this",
      dek: ru ? "Те же боли и опоры, с другой стороны: продукты, которые закрывают разрывы категории." : "The same pains and anchors, flipped into products that close the gaps.",
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

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-14">
      <div className="mx-auto max-w-[640px]">
        <div className="mb-8 flex items-center justify-between gap-3">
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

        {/* Hero — introduces the service, no prior knowledge assumed */}
        <header className="flex flex-col items-center gap-4 text-center">
          <span className="inline-flex rounded-full bg-[var(--color-bg-muted)] px-3 py-1 text-caption font-bold uppercase tracking-wide text-[var(--color-text-secondary)]">
            {ru ? "inApp · разбор категории" : "inApp · category breakdown"}
          </span>
          <h1 className="text-[40px] font-bold leading-[1.04] tracking-[-0.02em] text-[var(--color-text-primary)] sm:text-[54px]">{cat.name}</h1>
          <p className="mx-auto max-w-[56ch] text-lead leading-relaxed text-[var(--color-text-secondary)]">
            {ru
              ? "inApp читает отзывы приложений и собирает из них разбор: что в категории общего, что держит людей и что бесит, и какие продукты напрашиваются. Разобрали 10 приложений — прочитали по 500 последних отзывов в каждом."
              : "inApp reads app reviews and turns them into a breakdown: what the category shares, what keeps people and what enrages them, and which products the gaps imply. We broke down 10 apps — 500 of the latest reviews each."}
          </p>
        </header>
      </div>

      {/* The story deck */}
      <section className="mt-12">
        <CardCarousel slides={deck} locale={ru ? "ru" : "en"} />
      </section>

      {/* App roster */}
      <section className="mx-auto mt-20 max-w-[640px]">
        <h2 className="mb-4 text-center text-callout font-semibold text-[var(--color-text-secondary)]">
          {ru ? `Разобрали все отзывы в ${readyCount} приложениях` : `Analyzed every review across ${readyCount} apps`}
        </h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {cat.apps.map((a) => (
            <AppTile key={a.query} a={a as CatApp} />
          ))}
        </div>
      </section>
    </main>
  );
}
