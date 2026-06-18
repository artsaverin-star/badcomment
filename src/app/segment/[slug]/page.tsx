import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getCategoryBySlug } from "@/lib/researchCategories";
import { getSlugByProductId } from "@/lib/appSlugs";
import { hasInsight } from "@/lib/readyApps";
import { isActiveCategory } from "@/lib/categoryVisibility";
import { getLocale } from "@/lib/i18n.server";
import { appCardsFor, ideaContentEn, descriptionFor, type RegenCard } from "@/lib/regenCards";
import { getProductInsights } from "@/lib/insights";
import { getSegmentSummary, type SegmentSummaryEvidence } from "@/lib/segmentSummary";
import { listIdeas } from "@/lib/ideas";
import { getAccess } from "@/lib/access";
import { categoryPrice } from "@/lib/tokens";
import { UNLOCK_COST } from "@/lib/tokenConfig";
import UnlockGate from "@/components/UnlockGate";
import EnergyUnlockButton from "@/components/EnergyUnlockButton";
import CardCarousel, { type Slide, type Tone } from "@/components/CardCarousel";
import InsightCard, { type Evidence } from "@/components/InsightCard";
import { type Locale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

// Canonical category page: a hook-first landing for an aspiring app-maker, then
// a vertical card feed telling the category's story (free taste → «энергия»
// unlock), and per-app teasers. Replaces the old apps-grid + tabs layout.

// SEO: target what an aspiring app-maker actually searches — "какое приложение
// сделать в нише X", "идеи приложений 2026". Title + description carry the
// keywords; the page body is real review research (good for LLM citation).
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  if (!isActiveCategory(slug)) return {};
  const locale = await getLocale();
  const ru = locale !== "en";
  const cat = getCategoryBySlug(slug, locale);
  if (!cat) return {};
  const summary = getSegmentSummary(slug);
  const ideaCount = listIdeas().filter((i) => i.category === slug).length;
  const reviews = summary?.reviewsScanned ?? 5000;

  const title = ru
    ? `Идеи приложений: ${cat.name} — что построить в нише 2026`
    : `App ideas: ${cat.name} — what to build in this niche 2026`;
  const description = ru
    ? `Какое приложение сделать в нише «${cat.name}»? Разобрали ${summary?.appsCount ?? 10} приложений и ${reviews.toLocaleString("ru-RU")} отзывов: на что злятся пользователи, чего им не хватает и какие ${ideaCount} идей напрашиваются.`
    : `What app to build in the "${cat.name}" niche? We analyzed ${summary?.appsCount ?? 10} apps and ${reviews.toLocaleString("en-US")} reviews: what users hate, what's missing, and ${ideaCount} ideas worth building.`;

  return {
    title,
    description,
    keywords: ru
      ? ["идеи приложений", "какое приложение сделать", "ниша для приложения", cat.name, "идея для стартапа", "2026"]
      : ["app ideas", "what app to build", "app niche", cat.name, "startup idea", "2026"],
    openGraph: { title, description, type: "article" },
    twitter: { card: "summary_large_image", title, description },
    robots: { index: true, follow: true },
  };
}

type EvLike = { app?: string; rating: number; date: string; quote: string; quoteRu?: string };

function toneOfEv(ev: EvLike[]): Tone {
  if (!ev.length) return "info";
  const a = ev.reduce((s, e) => s + (e.rating || 0), 0) / ev.length;
  return a >= 3.6 ? "up" : a <= 2.7 ? "down" : "info";
}
function toneOfCard(c: RegenCard): Tone {
  const p = !!c.plus?.trim();
  const m = !!c.minus?.trim();
  if (p && m) return "mixed";
  if (p) return "up";
  if (m) return "down";
  return "info";
}
const elen = (e: EvLike) => (e.quote?.length ?? 0);
const evQuote = (e: EvLike, ru: boolean) => ({ app: e.app, rating: e.rating, date: e.date, text: ru ? e.quoteRu ?? e.quote : e.quote });
function orderEv(ev: EvLike[], tone: Tone, ru: boolean) {
  const pool = [...ev];
  if (tone === "down") pool.sort((a, b) => a.rating - b.rating || elen(b) - elen(a));
  else if (tone === "up") pool.sort((a, b) => b.rating - a.rating || elen(b) - elen(a));
  return pool.map((e) => evQuote(e, ru));
}

// Chapter-style salute for idea cards: floating lightbulbs (+ a spark).
const SALUTE_POS = [
  "left-[5%] top-[12%]",
  "right-[6%] top-[9%]",
  "left-[3%] top-[46%]",
  "right-[4%] top-[42%]",
  "left-[8%] bottom-[16%]",
  "right-[7%] bottom-[18%]",
  "left-[27%] top-[5%]",
  "right-[29%] bottom-[9%]",
  "left-[43%] bottom-[3%]",
  "right-[45%] top-[3%]",
];
const IDEA_GLYPHS = [
  // lightbulb
  "M9 18h6M9.5 21h5M12 3a6 6 0 0 1 3.6 10.8c-.5.4-.85 1-.95 1.7L14.5 18h-5l-.15-2.5c-.1-.7-.45-1.3-.95-1.7A6 6 0 0 1 12 3Z",
  // 4-point spark
  "M12 2c.6 4.2 1.8 5.4 6 6-4.2.6-5.4 1.8-6 6-.6-4.2-1.8-5.4-6-6 4.2-.6 5.4-1.8 6-6Z",
];

// Narrative arc: what holds → retains for years → erases progress → betrays in
// crisis (the moral climax) → then the ideas.
const ARC = ["механик", "сообществ", "прогресс", "истор", "кризис"];
const arcRank = (h: string) => {
  const i = ARC.findIndex((k) => h.toLowerCase().includes(k));
  return i === -1 ? ARC.length : i;
};

type ConclusionItem = { title: string; body?: string; count: number; evidence: Evidence[] };
type OppQuote = { app: string; rating: number; text: string };
type OppView = {
  slug: string; title: string; oneLiner: string; gap: string; pitch: string; features: string[]; monetization: string;
  gapApps: string[]; quotes: OppQuote[]; observations: number; apps: number; unlocked: boolean;
};
type AppView = {
  name: string; icon: string | null; slug: string | null; description?: string;
  avgRating: number | null; ratingCount: number | null; reviewsScanned: number; observations: number; hook: string; total: number; slides: Slide[]; unlocked: boolean;
};

export default async function SegmentPage({ params }: { params: Promise<{ slug: string }> }) {
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

  // Hook: the most-MENTIONED pain (highest count among genuinely negative items),
  // not the rarest 1★ outlier — evidence ratings are noisy, so gate on avg<3.4
  // then rank by volume.
  const itemAvg = (ev: SegmentSummaryEvidence[]) => (ev.length ? ev.reduce((s, e) => s + (e.rating || 0), 0) / ev.length : 5);
  const negatives = summary.items.filter((it) => itemAvg(it.evidence) < 3.4);
  const painItem = (negatives.length ? negatives : summary.items).sort((a, b) => b.observationCount - a.observationCount)[0];
  const painHook = painItem ? painItem.title.split(/\s[—–-]\s/)[0].trim() : "";
  const painLower = painHook ? painHook.charAt(0).toLowerCase() + painHook.slice(1) : "";

  // ── Access (category / per-idea / per-app gates) ──────────────────────
  const access = await getAccess();
  const loggedIn = access.loggedIn;
  const balance = access.balance;
  const catLocked = !access.has("category", slug);
  const catCost = access.user ? await categoryPrice(access.user.id, slug) : UNLOCK_COST.category;

  // ── Idea & app views ──
  const cardToSlide = (c: RegenCard): Slide => {
    const tone = toneOfCard(c);
    const ordered = orderEv(c.evidence as EvLike[], tone, ru);
    return { kind: "insight", kicker: c.kicker, title: c.title, plus: c.plus, minus: c.minus, count: c.count, tone, quote: ordered[0], evidence: ordered };
  };
  // ── Overview (free chapter 0): the whole research narrative as conclusions ──
  const conclusions: ConclusionItem[] = sections.flatMap((sec) =>
    sec.items.map((item) => {
      const tone = toneOfEv(item.evidence as SegmentSummaryEvidence[]);
      const ordered = orderEv(item.evidence as EvLike[], tone, ru);
      return { title: item.title, body: item.body, count: item.observationCount, evidence: ordered.map((q) => ({ app: q.app, rating: q.rating, date: q.date, quote: q.text })) };
    }),
  );
  const totalObs = sections.reduce((s, sec) => s + sec.items.reduce((t, it) => t + it.observationCount, 0), 0);

  // ── Opportunities (paid chapters): each idea, fully developed ──
  const opps: OppView[] = ideas.map((idea) => {
    const en = ideaContentEn(idea.slug, locale);
    return {
      slug: idea.slug,
      title: en?.title || idea.title,
      oneLiner: en?.oneLiner || idea.oneLiner,
      gap: en?.gap || idea.gap,
      pitch: en?.pitch || idea.idea.pitch,
      features: en?.features?.length ? en.features : idea.idea.features,
      monetization: en?.monetization || idea.idea.monetization,
      gapApps: [...new Set(idea.mechanisms.flatMap((m) => m.apps))].slice(0, 8),
      quotes: idea.reviewGrid.slice(0, 8).map((q) => ({ app: q.app, rating: q.rating, text: q.quote })),
      observations: idea.stats.observations,
      apps: idea.stats.apps,
      unlocked: !catLocked || access.has("idea", idea.slug),
    };
  });

  // ── Apps (competitor deep-dive, per-app unlock) ──
  const appViews: AppView[] = cat.apps
    .filter((a) => hasInsight(a.productId))
    .map((a) => {
      const pid = a.productId as string;
      const aslug = getSlugByProductId(pid);
      const cards = appCardsFor(pid, locale)?.product ?? [];
      const flawCard = cards.filter((c) => c.minus?.trim()).sort((x, y) => y.count - x.count)[0];
      const ins = getProductInsights(pid);
      const hist = ins?.ratingBreakdown ?? {};
      const histTotal = [1, 2, 3, 4, 5].reduce((s, n) => s + (hist[String(n)] ?? 0), 0);
      const avg = histTotal > 0 ? [1, 2, 3, 4, 5].reduce((s, n) => s + n * (hist[String(n)] ?? 0), 0) / histTotal : null;
      return {
        name: a.name,
        icon: a.icon,
        slug: aslug,
        description: descriptionFor(pid, locale, ins?.description),
        avgRating: avg,
        ratingCount: histTotal || null,
        reviewsScanned: ins?.reviewsScanned ?? 500,
        observations: cards.reduce((s, c) => s + c.count, 0) || cards.length,
        hook: flawCard?.minus?.trim() || flawCard?.title || "",
        total: cards.length,
        slides: cards.map(cardToSlide),
        unlocked: !catLocked || (aslug ? access.has("app", aslug) : false),
      };
    })
    .filter((a) => a.total > 0);

  const nav = [
    { h: "#overview", label: ru ? "Обзор" : "Overview" },
    ...opps.map((_, i) => ({ h: `#op-${i}`, label: ru ? `Возможность ${i + 1}` : `Opportunity ${i + 1}` })),
    ...(appViews.length ? [{ h: "#apps", label: ru ? "Приложения" : "Apps" }] : []),
  ];

  // Schema.org structured data — helps search engines and LLMs parse the page
  // as a research article with a list of app ideas.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: ru ? `Идеи приложений: ${cat.name} — что построить в нише 2026` : `App ideas: ${cat.name} — what to build in 2026`,
    inLanguage: ru ? "ru" : "en",
    about: cat.name,
    keywords: ru ? `идеи приложений, какое приложение сделать, ниша для приложения, ${cat.name}` : `app ideas, what app to build, app niche, ${cat.name}`,
    author: { "@type": "Organization", name: "inApp", url: "https://inapp.pro" },
    publisher: { "@type": "Organization", name: "inApp", url: "https://inapp.pro" },
    mainEntity: {
      "@type": "ItemList",
      name: ru ? `Идеи приложений: ${cat.name}` : `App ideas: ${cat.name}`,
      numberOfItems: ideas.length,
      // Titles are gated content — expose only position + proven-demand size so
      // the count is indexable without leaking the ideas themselves.
      itemListElement: ideas.map((idea, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: ru ? `Идея №${i + 1} · спрос ${idea.stats.observations} наблюдений` : `Idea #${i + 1} · demand ${idea.stats.observations} observations`,
        url: `https://inapp.pro/${ru ? "ru" : "en"}/ideas/${idea.slug}`,
      })),
    },
  };

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Section nav — pinned to the top from the start, detailed by point */}
      <nav
        aria-label={ru ? "Разделы" : "Sections"}
        className="sticky top-14 z-30 -mx-4 -mt-6 mb-6 border-b border-[var(--color-border-subtle)] bg-[color-mix(in_srgb,var(--color-bg-page)_82%,transparent)] px-4 py-2.5 backdrop-blur-md sm:-mt-8"
      >
        <div className="flex gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {nav.map((n) => (
            <a
              key={n.h}
              href={n.h}
              className="shrink-0 truncate rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] px-3.5 py-1.5 text-footnote font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]"
            >
              {n.label}
            </a>
          ))}
        </div>
      </nav>

      <div className="mx-auto max-w-[640px]">
        <div className="mb-8 flex items-center justify-between gap-3">
          <Link
            href="/catalog"
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] px-3.5 py-1.5 text-footnote font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M10 3.5 5.5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {ru ? "Все категории" : "All categories"}
          </Link>
        </div>

        {/* Hero — hook-first, no internal mechanics */}
        <header className="flex flex-col items-center gap-4 text-center">
          <span className="inline-flex rounded-full bg-[var(--color-bg-muted)] px-3 py-1 text-caption font-bold uppercase tracking-wide text-[var(--color-text-secondary)]">
            {ru ? "Идея для приложения · ниша 2026" : "App idea · niche 2026"}
          </span>
          <h1 className="text-[34px] font-bold leading-[1.06] tracking-[-0.02em] text-[var(--color-text-primary)] sm:text-[48px]">
            {ru ? <>Идеи приложений: {cat.name}</> : <>App ideas: {cat.name}</>}
          </h1>
          {painLower && (
            <p className="mx-auto max-w-[54ch] text-lead leading-relaxed text-[var(--color-text-secondary)]">
              {ru ? (
                <>
                  А знаете, на что в этих приложениях злятся сильнее всего? <b className="text-[var(--color-text-primary)]">{painLower}</b>. Сделайте приложение без
                  этого — и у вас потенциальный хит.
                </>
              ) : (
                <>
                  Want to know the one thing people hate most in these apps? <b className="text-[var(--color-text-primary)]">{painLower}</b>. Build one without it —
                  and you’ve got a potential hit.
                </>
              )}
            </p>
          )}
          <p className="mx-auto max-w-[52ch] text-callout leading-relaxed text-[var(--color-text-secondary)]">
            {ru ? (
              <>
                Мы разобрали {readyCount} приложений и собрали <b className="text-[var(--color-text-primary)]">{ideas.length}</b> идей улучшений, которые люди сами
                просят в отзывах. Открывайте ниже.
              </>
            ) : (
              <>
                We analyzed {readyCount} apps and pulled together <b className="text-[var(--color-text-primary)]">{ideas.length}</b> improvement ideas users ask for
                themselves. Open them below.
              </>
            )}
          </p>
        </header>
      </div>

      {/* OVERVIEW — free chapter 0: the whole research narrative */}
      <section id="overview" className="mx-auto mt-8 max-w-[660px] scroll-mt-28">
        <div className="overflow-hidden rounded-[28px] border border-[color-mix(in_srgb,var(--color-text-brand)_22%,var(--color-border-subtle))] bg-[var(--color-surface-card)] shadow-[0_24px_60px_-30px_rgba(0,0,0,0.7)]">
          <div className="relative px-6 pb-6 pt-7 sm:px-8">
            <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-32 opacity-[0.2]" style={{ background: "radial-gradient(120% 80% at 50% 0%, var(--color-text-brand) 0%, transparent 70%)" }} />
            <div className="relative">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="text-caption font-bold uppercase tracking-[0.12em] text-[var(--color-text-brand)]">{ru ? "Обзор ниши" : "Niche overview"}</span>
                <span className="rounded-full bg-[color-mix(in_srgb,#4ade80_22%,transparent)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#4ade80]">{ru ? "бесплатно" : "free"}</span>
              </div>
              <h2 className="text-[24px] font-bold leading-[1.16] tracking-[-0.01em] text-[var(--color-text-primary)] sm:text-[28px]">{ru ? "Что общего у приложений ниши" : "What the niche's apps share"}</h2>
              {summary.lead && <p className="mt-2 text-callout leading-relaxed text-[var(--color-text-secondary)]">{summary.lead}</p>}
              <div className="mt-4 flex flex-wrap gap-x-2.5 gap-y-1 text-footnote tabular-nums text-[var(--color-text-tertiary)]">
                <span>{readyCount} {ru ? "приложений" : "apps"}</span>
                <span aria-hidden>·</span>
                <span>{summary.reviewsScanned.toLocaleString(ru ? "ru-RU" : "en-US")} {ru ? "отзывов" : "reviews"}</span>
                <span aria-hidden>·</span>
                <span>{totalObs.toLocaleString(ru ? "ru-RU" : "en-US")} {ru ? "наблюдений" : "observations"}</span>
                <span aria-hidden>·</span>
                <span className="font-semibold text-[var(--color-text-brand)]">{opps.length} {ru ? "возможностей" : "opportunities"}</span>
              </div>
            </div>
          </div>
          {conclusions.length > 0 && (
            <div className="border-t border-[var(--color-border-subtle)] px-6 py-5 sm:px-8">
              <h3 className="mb-1 text-caption font-bold uppercase tracking-wide text-[var(--color-text-tertiary)]">{ru ? "Что выяснили" : "What we found"}</h3>
              {conclusions.map((c, k) => (
                <InsightCard key={k} locale={locale} title={c.title} body={c.body} count={c.count} evidence={c.evidence} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* OPPORTUNITIES — each idea, fully developed; unlock per opportunity */}
      {opps.map((op, i) => (
        <section key={i} id={`op-${i}`} className="mx-auto mt-8 max-w-[660px] scroll-mt-28">
          <div className="overflow-hidden rounded-[28px] border border-[color-mix(in_srgb,var(--color-text-brand)_22%,var(--color-border-subtle))] bg-[var(--color-surface-card)] shadow-[0_24px_60px_-30px_rgba(0,0,0,0.7)]">
            <div className="relative px-6 pb-6 pt-7 sm:px-8">
              <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-32 opacity-[0.2]" style={{ background: "radial-gradient(120% 80% at 50% 0%, var(--color-text-brand) 0%, transparent 70%)" }} />
              <div aria-hidden className="pointer-events-none absolute inset-0 text-[var(--color-text-brand)]">
                {SALUTE_POS.map((pos, k) => (
                  <span key={k} className={`ld-float absolute block opacity-[0.14] ${k % 3 === 0 ? "size-10" : "size-8"} ${pos}`} style={{ ["--d" as string]: `${4.5 + (k % 5) * 0.7}s`, ["--r" as string]: `${k % 2 ? 7 : -7}deg`, animationDelay: `${(k % 6) * 0.25}s` }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="size-full">
                      <path d={IDEA_GLYPHS[k % IDEA_GLYPHS.length]} />
                    </svg>
                  </span>
                ))}
                <span className="absolute inset-0" style={{ background: "radial-gradient(72% 70% at 50% 40%, var(--color-surface-card) 26%, transparent 100%)" }} />
              </div>
              <div className="relative">
                <span className="text-caption font-bold uppercase tracking-[0.12em] text-[var(--color-text-brand)]">{ru ? `Возможность ${i + 1} · спрос ${op.observations} наблюдений` : `Opportunity ${i + 1} · demand ${op.observations} observations`}</span>
                {op.unlocked ? (
                  <>
                    <h2 className="mt-2 text-[24px] font-bold leading-[1.14] tracking-[-0.01em] text-[var(--color-text-primary)] sm:text-[28px]">{op.title}</h2>
                    <p className="mt-2 text-callout leading-relaxed text-[var(--color-text-secondary)]">{op.oneLiner}</p>
                  </>
                ) : (
                  <p className="mt-2 text-[20px] font-bold leading-snug text-[var(--color-text-primary)]">{ru ? "Готовая возможность под подтверждённый спрос" : "A ready opportunity for proven demand"}</p>
                )}
              </div>
            </div>

            {op.unlocked ? (
              <>
                <div className="border-t border-[var(--color-border-subtle)] px-6 py-5 sm:px-8">
                  <h3 className="mb-1.5 text-caption font-bold uppercase tracking-wide text-[var(--color-text-tertiary)]">{ru ? "Разрыв" : "The gap"}</h3>
                  <p className="text-footnote leading-relaxed text-[var(--color-text-secondary)]">{op.gap}</p>
                </div>
                {op.quotes.length > 0 && (
                  <div className="border-t border-[var(--color-border-subtle)] px-6 py-5 sm:px-8">
                    <h3 className="mb-2.5 text-caption font-bold uppercase tracking-wide text-[var(--color-text-tertiary)]">{ru ? "Доказательства из отзывов" : "Evidence from reviews"}</h3>
                    <div className="flex flex-col gap-3">
                      {op.quotes.slice(0, 6).map((q, k) => (
                        <figure key={k} className="border-l-2 border-[color-mix(in_srgb,var(--color-text-brand)_50%,transparent)] pl-3">
                          <p className="text-footnote italic leading-relaxed text-[var(--color-text-secondary)]">“{q.text}”</p>
                          <figcaption className="mt-1 text-caption text-[var(--color-text-tertiary)]">{q.app} · <span className="text-[#f5b301]">{"★".repeat(q.rating)}</span></figcaption>
                        </figure>
                      ))}
                    </div>
                  </div>
                )}
                {op.gapApps.length > 0 && (
                  <div className="border-t border-[var(--color-border-subtle)] px-6 py-5 sm:px-8">
                    <h3 className="mb-2 text-caption font-bold uppercase tracking-wide text-[var(--color-text-tertiary)]">{ru ? "Где эта дыра" : "Where the gap is"}</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {op.gapApps.map((a, k) => (
                        <span key={k} className="rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-bg-subtle)] px-2.5 py-1 text-caption text-[var(--color-text-secondary)]">{a}</span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="border-t border-[var(--color-border-subtle)] px-6 py-5 sm:px-8">
                  <h3 className="mb-1.5 text-caption font-bold uppercase tracking-wide text-[var(--color-text-tertiary)]">{ru ? "Что строить" : "What to build"}</h3>
                  <p className="text-footnote leading-relaxed text-[var(--color-text-secondary)]">{op.pitch}</p>
                  {op.features.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {op.features.slice(0, 6).map((f, k) => (
                        <span key={k} className="rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-bg-subtle)] px-2.5 py-1 text-caption text-[var(--color-text-secondary)]">{f}</span>
                      ))}
                    </div>
                  )}
                </div>
                {op.monetization && (
                  <div className="border-t border-[var(--color-border-subtle)] px-6 py-5 sm:px-8">
                    <h3 className="mb-1.5 text-caption font-bold uppercase tracking-wide text-[var(--color-text-tertiary)]">{ru ? "Как монетизировать" : "How to monetize"}</h3>
                    <p className="text-footnote leading-relaxed text-[var(--color-text-secondary)]">{op.monetization}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-start gap-3 border-t border-[var(--color-border-subtle)] px-6 py-6 sm:px-8">
                {op.quotes[0] && (
                  <figure className="border-l-2 border-[color-mix(in_srgb,var(--color-text-brand)_50%,transparent)] pl-3">
                    <p className="text-footnote italic leading-relaxed text-[var(--color-text-secondary)]">“{op.quotes[0].text}”</p>
                    <figcaption className="mt-1 text-caption text-[var(--color-text-tertiary)]">{op.quotes[0].app} · <span className="text-[#f5b301]">{"★".repeat(op.quotes[0].rating)}</span></figcaption>
                  </figure>
                )}
                <p className="text-footnote text-[var(--color-text-tertiary)]">
                  {ru ? `Это одна из жалоб. Внутри — разрыв, ещё ${Math.max(0, op.quotes.length - 1)} доказательств, у каких приложений и что строить + монетизация.` : `One of the complaints. Inside — the gap, ${Math.max(0, op.quotes.length - 1)} more proofs, which apps have it, and what to build + monetization.`}
                </p>
                <EnergyUnlockButton type="idea" slug={op.slug} cost={UNLOCK_COST.idea} loggedIn={loggedIn} balance={balance} locale={locale} label={ru ? "Открыть возможность" : "Unlock opportunity"} />
              </div>
            )}
          </div>
        </section>
      ))}

      {/* APPS — competitor deep-dive, per-app unlock */}
      {appViews.length > 0 && (
        <section id="apps" className="mx-auto mt-12 max-w-[660px] scroll-mt-28">
          <div className="overflow-hidden rounded-[28px] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] shadow-[0_24px_60px_-30px_rgba(0,0,0,0.7)]">
            <div className="relative px-6 pb-6 pt-7 sm:px-8">
              <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-28 opacity-[0.16]" style={{ background: "radial-gradient(120% 80% at 50% 0%, var(--color-text-brand) 0%, transparent 70%)" }} />
              <div className="relative">
                <span className="text-caption font-bold uppercase tracking-[0.12em] text-[var(--color-text-brand)]">{ru ? "Конкуренты" : "Competitors"}</span>
                <h2 className="text-[24px] font-bold leading-[1.16] tracking-[-0.01em] text-[var(--color-text-primary)] sm:text-[28px]">{ru ? `Разбор ${appViews.length} приложений` : `Breakdown of ${appViews.length} apps`}</h2>
                <p className="mt-2 text-callout leading-relaxed text-[var(--color-text-secondary)]">{ru ? "По каждому — что хвалят, на что злятся, где косяк. Откройте за энергию." : "For each — what's loved, hated, and broken. Unlock for energy."}</p>
              </div>
            </div>
            <div className="flex flex-col divide-y divide-[var(--color-border-subtle)] border-t border-[var(--color-border-subtle)] px-6 py-2 sm:px-8">
              {appViews.map((app, k) =>
                app.unlocked ? (
                  <details key={k} id={`app-${k}`} className="group/app scroll-mt-28">
                    <summary className="flex cursor-pointer list-none items-center gap-3 py-3 [&::-webkit-details-marker]:hidden">
                      {app.icon ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={app.icon} alt="" loading="lazy" decoding="async" className="size-10 shrink-0 rounded-[11px] object-cover" />
                      ) : (
                        <div className="size-10 shrink-0 rounded-[11px] bg-[var(--color-bg-muted)]" />
                      )}
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-callout font-semibold text-[var(--color-text-primary)]">{app.name}</span>
                        <span className="text-caption tabular-nums text-[var(--color-text-tertiary)]">{app.avgRating != null ? `★ ${app.avgRating.toFixed(1)} · ` : ""}{app.total} {ru ? "наблюдений" : "observations"}</span>
                      </span>
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-bg-muted)] text-[var(--color-text-secondary)] transition-transform group-open/app:rotate-180">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </span>
                    </summary>
                    <div className="details-reveal pb-3">
                      {app.description && <p className="mb-3 text-footnote leading-relaxed text-[var(--color-text-secondary)]">{app.description}</p>}
                      <CardCarousel slides={app.slides} locale={ru ? "ru" : "en"} layout="feed" />
                    </div>
                  </details>
                ) : (
                  <div key={k} id={`app-${k}`} className="flex scroll-mt-28 items-center gap-3 py-3">
                    {app.icon ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={app.icon} alt="" loading="lazy" decoding="async" className="size-10 shrink-0 rounded-[11px] object-cover" />
                    ) : (
                      <div className="size-10 shrink-0 rounded-[11px] bg-[var(--color-bg-muted)]" />
                    )}
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-callout font-semibold text-[var(--color-text-primary)]">{app.name}</span>
                      <span className="truncate text-caption text-[var(--color-text-tertiary)]">{app.hook || `${app.total} ${ru ? "наблюдений" : "observations"}`}</span>
                    </span>
                    <EnergyUnlockButton type="app" slug={app.slug as string} cost={UNLOCK_COST.app} loggedIn={loggedIn} balance={balance} locale={locale} label={ru ? "Открыть" : "Unlock"} />
                  </div>
                ),
              )}
            </div>
          </div>
        </section>
      )}

      {/* Buy-all — the whole category at a bundle price */}
      {catLocked && (
        <div className="mx-auto mt-12 max-w-[660px]">
          <UnlockGate
            type="category"
            slug={slug}
            cost={catCost}
            loggedIn={loggedIn}
            balance={balance}
            locale={locale}
            title={ru ? "Открыть всё разом: обзор, все возможности и приложения" : "Unlock everything: overview, all opportunities and apps"}
          />
        </div>
      )}
    </main>
  );
}
