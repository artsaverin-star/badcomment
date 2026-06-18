import { notFound } from "next/navigation";
import Link from "next/link";
import { getResearchCategory, getCategoryBySlug } from "@/lib/researchCategories";
import { getSlugByProductId } from "@/lib/appSlugs";
import { hasInsight } from "@/lib/readyApps";
import { isActiveCategory } from "@/lib/categoryVisibility";
import { getLocale } from "@/lib/i18n.server";
import { categoryCards, ideaContentEn } from "@/lib/regenCards";
import { getSegmentSummary } from "@/lib/segmentSummary";
import { listIdeas, type Idea } from "@/lib/ideas";
import InsightCard from "@/components/InsightCard";
import type { Locale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

// Experiment: the category breakdown reframed as an editorial landing/longread.
// Hero → app roster → "Ключевое в категории 2026": the cross-app insight cards
// woven together with the ideas they imply, so it reads as a story rather than
// two stacked tabs. Same data as /segment/<slug>.

type CatApp = { query: string; name: string; icon: string; productId: string | null };

function AppTile({ a }: { a: CatApp }) {
  const ready = hasInsight(a.productId);
  const linkSlug = ready && a.productId ? getSlugByProductId(a.productId) : null;
  const tile =
    "flex items-center gap-3 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] px-3 py-2.5";
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

function ideaView(idea: Idea, locale: Locale) {
  const en = ideaContentEn(idea.slug, locale);
  return {
    slug: idea.slug,
    title: en?.title || idea.title,
    oneLiner: en?.oneLiner || idea.oneLiner,
    gap: en?.gap || idea.gap,
    pitch: en?.pitch || idea.idea.pitch,
    features: en?.features?.length ? en.features : idea.idea.features,
    stats: idea.stats,
  };
}

function IdeaStory({ idea, ru }: { idea: ReturnType<typeof ideaView>; ru: boolean }) {
  return (
    <article className="rounded-[var(--radius-2xl)] border border-[color-mix(in_srgb,var(--color-text-brand)_35%,transparent)] bg-[var(--color-accent-brand-subtle)] p-6 sm:p-7">
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--color-text-brand)_18%,transparent)] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-[var(--color-text-brand)]">
          {ru ? "Идея" : "Idea"}
        </span>
        <span className="text-caption tabular-nums text-[var(--color-text-tertiary)]">
          {ru
            ? `из ${idea.stats.observations} наблюдений · ${idea.stats.apps} приложений`
            : `from ${idea.stats.observations} observations · ${idea.stats.apps} apps`}
        </span>
      </div>
      <h3 className="text-[24px] font-bold leading-[1.15] tracking-[-0.01em] text-[var(--color-text-primary)] sm:text-[28px]">{idea.title}</h3>
      <p className="mt-2 text-callout leading-relaxed text-[var(--color-text-secondary)]">{idea.oneLiner}</p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <span className="text-caption font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">{ru ? "Разрыв" : "The gap"}</span>
          <p className="text-footnote leading-relaxed text-[var(--color-text-secondary)]">{idea.gap}</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-caption font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">{ru ? "Что строить" : "What to build"}</span>
          <p className="text-footnote leading-relaxed text-[var(--color-text-secondary)]">{idea.pitch}</p>
        </div>
      </div>

      {idea.features.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {idea.features.slice(0, 5).map((f, i) => (
            <span key={i} className="rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] px-2.5 py-1 text-caption text-[var(--color-text-secondary)]">
              {f}
            </span>
          ))}
        </div>
      )}

      <Link
        href={`/ideas/${idea.slug}`}
        className="mt-5 inline-flex items-center gap-1.5 text-footnote font-semibold text-[var(--color-text-brand)] transition-opacity hover:opacity-80"
      >
        {ru ? "Идея целиком" : "Full idea"}
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="m6 4 4 4-4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>
    </article>
  );
}

export default async function SegmentLandingTest({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = await getLocale();
  const ru = locale !== "en";

  if (!isActiveCategory(slug)) notFound();
  const cat = getCategoryBySlug(slug, locale) ?? getResearchCategory(slug, locale);
  if (!cat) notFound();

  const summary = getSegmentSummary(slug);
  const cards = categoryCards(slug, locale)?.product ?? [];
  const ideas = listIdeas().filter((i) => i.category === slug);
  const readyCount = cat.apps.filter((a) => hasInsight(a.productId)).length;
  const reviews = summary?.reviewsScanned ?? readyCount * 500;
  const observations = cards.reduce((s, c) => s + c.count, 0);

  // Weave: a couple of insight cards, then the idea they imply — repeat.
  const blocks: React.ReactNode[] = [];
  const step = ideas.length ? Math.max(2, Math.floor(cards.length / ideas.length)) : Infinity;
  let ii = 0;
  cards.forEach((c, i) => {
    blocks.push(
      <InsightCard key={`c${i}`} card locale={locale} title={c.title} body={c.body} plus={c.plus} minus={c.minus} count={c.count} kicker={c.kicker} apps={c.apps} evidence={c.evidence} />,
    );
    if (ii < ideas.length && (i + 1) % step === 0) {
      blocks.push(<IdeaStory key={`i${ii}`} idea={ideaView(ideas[ii], locale)} ru={ru} />);
      ii++;
    }
  });
  while (ii < ideas.length) {
    blocks.push(<IdeaStory key={`i${ii}`} idea={ideaView(ideas[ii], locale)} ru={ru} />);
    ii++;
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-14">
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

      {/* Hero */}
      <header className="flex flex-col items-center gap-4 text-center">
        <span className="inline-flex rounded-full bg-[var(--color-bg-muted)] px-3 py-1 text-caption font-bold uppercase tracking-wide text-[var(--color-text-secondary)]">
          {ru ? "Разбор категории" : "Category breakdown"}
        </span>
        <h1 className="text-[40px] font-bold leading-[1.04] tracking-[-0.02em] text-[var(--color-text-primary)] sm:text-[56px]">{cat.name}</h1>
        <p className="mx-auto max-w-[56ch] text-lead leading-relaxed text-[var(--color-text-secondary)]">
          {ru ? (
            <>
              Разобрали <b className="tabular-nums text-[var(--color-text-primary)]">{readyCount}</b> приложений, в каждом — по{" "}
              <b className="tabular-nums text-[var(--color-text-primary)]">500</b> последних отзывов. Свели всё в один разбор: что держит людей, что бесит и какие продукты напрашиваются.
            </>
          ) : (
            <>
              We broke down <b className="tabular-nums text-[var(--color-text-primary)]">{readyCount}</b> apps, <b className="tabular-nums text-[var(--color-text-primary)]">500</b> of the latest reviews each —
              merged into one read: what keeps people, what enrages them, and which products the gaps imply.
            </>
          )}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-footnote tabular-nums text-[var(--color-text-tertiary)]">
          <span>{readyCount} {ru ? "приложений" : "apps"}</span>
          <span aria-hidden>·</span>
          <span>{reviews.toLocaleString(ru ? "ru-RU" : "en-US")} {ru ? "отзывов" : "reviews"}</span>
          <span aria-hidden>·</span>
          <span>{observations.toLocaleString(ru ? "ru-RU" : "en-US")} {ru ? "наблюдений" : "observations"}</span>
        </div>
      </header>

      {/* App roster */}
      <section className="mt-12">
        <h2 className="mb-4 text-callout font-semibold text-[var(--color-text-secondary)]">{ru ? "Приложения категории" : "Apps in this category"}</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {cat.apps.map((a) => (
            <AppTile key={a.query} a={a} />
          ))}
        </div>
      </section>

      {/* Storytelling: cards woven with ideas */}
      {blocks.length > 0 && (
        <section className="mt-16">
          <div className="mb-6 flex flex-col gap-2">
            <h2 className="text-[28px] font-bold tracking-[-0.01em] text-[var(--color-text-primary)]">{ru ? "Ключевое в категории · 2026" : "Key in this category · 2026"}</h2>
            {summary?.lead && <p className="max-w-[60ch] text-callout leading-relaxed text-[var(--color-text-secondary)]">{summary.lead}</p>}
          </div>
          <div className="flex flex-col gap-3">{blocks}</div>
        </section>
      )}
    </main>
  );
}
