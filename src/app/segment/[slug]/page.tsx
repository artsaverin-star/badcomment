import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getCategoryBySlug } from "@/lib/researchCategories";
import { getSlugByProductId } from "@/lib/appSlugs";
import { hasInsight } from "@/lib/readyApps";
import { isActiveCategory } from "@/lib/categoryVisibility";
import { getLocale } from "@/lib/i18n.server";
import { appCardsFor, ideaContentEn, type RegenCard } from "@/lib/regenCards";
import { getSegmentSummary, type SegmentSummaryEvidence } from "@/lib/segmentSummary";
import { listIdeas } from "@/lib/ideas";
import { getAccess } from "@/lib/access";
import { categoryPrice } from "@/lib/tokens";
import { UNLOCK_COST } from "@/lib/tokenConfig";
import UnlockGate from "@/components/UnlockGate";
import EnergyUnlockButton from "@/components/EnergyUnlockButton";
import CardCarousel, { type Slide, type Tone } from "@/components/CardCarousel";

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

// Narrative arc: what holds → retains for years → erases progress → betrays in
// crisis (the moral climax) → then the ideas.
const ARC = ["механик", "сообществ", "прогресс", "истор", "кризис"];
const arcRank = (h: string) => {
  const i = ARC.findIndex((k) => h.toLowerCase().includes(k));
  return i === -1 ? ARC.length : i;
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
  const observations = summary.items.reduce((s, i) => s + i.observationCount, 0);

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

  // ── Category deck: cover + authored narrative chapters (ideas & apps live in
  // their own per-energy sections below). First 3 cards are a free taste. ──
  const chapters = sections.length;
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
  const FREE = 3;
  const visibleDeck = catLocked ? deck.slice(0, FREE) : deck;

  // ── Ideas: each unlocks individually for «энергия» ──
  const ideaCards = ideas.map((idea) => {
    const en = ideaContentEn(idea.slug, locale);
    return {
      slug: idea.slug,
      title: en?.title || idea.title,
      oneLiner: en?.oneLiner || idea.oneLiner,
      gap: en?.gap || idea.gap,
      pitch: en?.pitch || idea.idea.pitch,
      features: en?.features?.length ? en.features : idea.idea.features,
      stats: idea.stats,
      unlocked: access.has("idea", idea.slug),
    };
  });

  // ── Per-app breakdowns: each app's review cards, unlocked individually ──
  const cardToSlide = (c: RegenCard): Slide => {
    const tone = toneOfCard(c);
    const ordered = orderEv(c.evidence as EvLike[], tone, ru);
    return { kind: "insight", kicker: c.kicker, title: c.title, plus: c.plus, minus: c.minus, count: c.count, tone, quote: ordered[0], evidence: ordered };
  };
  const appSections = cat.apps
    .filter((a) => hasInsight(a.productId))
    .map((a) => {
      const pid = a.productId as string;
      const aslug = getSlugByProductId(pid);
      const cards = appCardsFor(pid, locale)?.product ?? [];
      const flawCard = cards.filter((c) => c.minus?.trim()).sort((x, y) => y.count - x.count)[0];
      return {
        name: a.name,
        icon: a.icon,
        slug: aslug,
        hook: flawCard?.minus?.trim() || flawCard?.title || "",
        total: cards.length,
        unlocked: aslug ? access.has("app", aslug) : false,
        slides: cards.map(cardToSlide),
      };
    })
    .filter((a) => a.total > 0);

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
      itemListElement: ideas.map((idea, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: ideaContentEn(idea.slug, locale)?.title || idea.title,
        description: ideaContentEn(idea.slug, locale)?.oneLiner || idea.oneLiner,
        url: `https://inapp.pro/${ru ? "ru" : "en"}/ideas/${idea.slug}`,
      })),
    },
  };

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
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
                просят в отзывах. Все — ниже.
              </>
            ) : (
              <>
                We analyzed {readyCount} apps and pulled together <b className="text-[var(--color-text-primary)]">{ideas.length}</b> improvement ideas users ask for
                themselves. All below.
              </>
            )}
          </p>
          <p className="text-caption text-[var(--color-text-tertiary)]">
            {ru ? "Обычно такой маркет-ресёрч — это недели работы и большой бюджет. Здесь он уже готов." : "Market research like this usually takes weeks and a big budget. Here it’s already done."}
          </p>
        </header>
      </div>

      {/* The story feed — first cards free, the rest unlock for «энергия» */}
      <section className="mt-14">
        <CardCarousel slides={visibleDeck} locale={ru ? "ru" : "en"} layout="feed" />
        {catLocked && (
          <div className="mx-auto mt-6 max-w-[640px]">
            <UnlockGate
              type="category"
              slug={slug}
              cost={catCost}
              loggedIn={loggedIn}
              balance={balance}
              locale={locale}
              title={ru ? `Открыть весь разбор категории: ${deck.length - FREE} карточек и главы` : `Unlock the full category breakdown: ${deck.length - FREE} more cards and chapters`}
            />
          </div>
        )}
      </section>

      {/* Ideas — each unlocks individually for «энергия» */}
      {ideaCards.length > 0 && (
        <section className="mx-auto mt-20 max-w-[640px]">
          <h2 className="mb-1 text-center text-[26px] font-bold tracking-[-0.01em] text-[var(--color-text-primary)]">
            {ru ? `${ideaCards.length} идей приложений из этих отзывов` : `${ideaCards.length} app ideas from these reviews`}
          </h2>
          <p className="mb-6 text-center text-callout text-[var(--color-text-secondary)]">
            {ru ? "Готовые продукты, которые закрывают разрывы категории. Откройте любую за энергию." : "Ready products that close the category's gaps. Unlock any for energy."}
          </p>
          <div className="flex flex-col gap-3">
            {ideaCards.map((idea, i) => (
              <article key={i} className="rounded-[var(--radius-2xl)] border border-[color-mix(in_srgb,var(--color-text-brand)_30%,transparent)] bg-[var(--color-accent-brand-subtle)] p-5 sm:p-6">
                <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="inline-flex rounded-full bg-[color-mix(in_srgb,var(--color-text-brand)_18%,transparent)] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-[var(--color-text-brand)]">{ru ? "Идея" : "Idea"}</span>
                  <span className="text-caption tabular-nums text-[var(--color-text-tertiary)]">{ru ? `из ${idea.stats.observations} наблюдений` : `from ${idea.stats.observations} observations`}</span>
                </div>
                <h3 className="text-[21px] font-bold leading-[1.18] tracking-[-0.01em] text-[var(--color-text-primary)]">{idea.title}</h3>
                <p className="mt-2 text-callout leading-relaxed text-[var(--color-text-secondary)]">{idea.oneLiner}</p>
                {idea.unlocked ? (
                  <div className="mt-4 flex flex-col gap-4">
                    <div className="grid gap-4 sm:grid-cols-2">
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
                      <div className="flex flex-wrap gap-1.5">
                        {idea.features.slice(0, 6).map((f, j) => (
                          <span key={j} className="rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] px-2.5 py-1 text-caption text-[var(--color-text-secondary)]">{f}</span>
                        ))}
                      </div>
                    )}
                    <Link href={`/ideas/${idea.slug}`} className="inline-flex w-fit items-center gap-1.5 text-footnote font-semibold text-[var(--color-text-brand)] hover:opacity-80">
                      {ru ? "Идея целиком" : "Full idea"} →
                    </Link>
                  </div>
                ) : (
                  <div className="mt-4">
                    <EnergyUnlockButton type="idea" slug={idea.slug} cost={UNLOCK_COST.idea} loggedIn={loggedIn} balance={balance} locale={locale} label={ru ? "Открыть идею" : "Unlock idea"} />
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Per-app breakdowns — each app's cards, unlocked individually */}
      {appSections.length > 0 && (
        <section className="mx-auto mt-20 max-w-[760px]">
          <h2 className="mb-1 text-center text-[26px] font-bold tracking-[-0.01em] text-[var(--color-text-primary)]">
            {ru ? `Разбор всех ${appSections.length} приложений` : `Breakdown of all ${appSections.length} apps`}
          </h2>
          <p className="mb-8 text-center text-callout text-[var(--color-text-secondary)]">
            {ru ? "По каждому приложению — все наблюдения карточками. Откройте любое за энергию." : "Every app's observations as cards. Unlock any for energy."}
          </p>
          <div className="flex flex-col gap-10">
            {appSections.map((app, i) => (
              <div key={i}>
                <div className="mx-auto mb-4 flex max-w-[640px] items-center gap-3">
                  {app.icon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={app.icon} alt="" loading="lazy" decoding="async" className="size-12 shrink-0 rounded-[14px] object-cover" />
                  ) : (
                    <div className="size-12 shrink-0 rounded-[14px] bg-[var(--color-bg-muted)]" />
                  )}
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-lead font-bold text-[var(--color-text-primary)]">{app.name}</span>
                    <span className="text-caption text-[var(--color-text-tertiary)]">{ru ? `${app.total} наблюдений в разборе` : `${app.total} observations`}</span>
                  </div>
                </div>
                {app.unlocked ? (
                  <CardCarousel slides={app.slides} locale={ru ? "ru" : "en"} layout="feed" />
                ) : (
                  <div className="mx-auto flex max-w-[640px] flex-col gap-3 rounded-[var(--radius-2xl)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-5 text-center">
                    {app.hook && (
                      <p className="mx-auto max-w-[48ch] text-callout leading-relaxed text-[var(--color-text-secondary)]">
                        {ru ? <>«{app.hook}» — и это лишь одно из <b className="text-[var(--color-text-primary)]">{app.total}</b> наблюдений внутри.</> : <>“{app.hook}” — just one of <b className="text-[var(--color-text-primary)]">{app.total}</b> observations inside.</>}
                      </p>
                    )}
                    <div className="mx-auto">
                      <EnergyUnlockButton type="app" slug={app.slug as string} cost={UNLOCK_COST.app} loggedIn={loggedIn} balance={balance} locale={locale} label={ru ? `Открыть ${app.total} карточек` : `Unlock ${app.total} cards`} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
