import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getCategoryBySlug, listDomains } from "@/lib/researchCategories";
import { RATING_BY_SLUG } from "@/data/peoplesRating";
import { hueFromSlug } from "@/lib/categoryGradient";
import AtmosphereSetter from "@/components/AtmosphereSetter";
import { getSlugByProductId } from "@/lib/appSlugs";
import { hasInsight } from "@/lib/readyApps";
import { isActiveCategory } from "@/lib/categoryVisibility";
import { isUltra, hasPeoplesRating } from "@/lib/ultra";
import { getLocale } from "@/lib/i18n.server";
import { appCardsFor, categoryCards, ideaContentEn, descriptionFor, type RegenCard } from "@/lib/regenCards";
import { getProductInsights } from "@/lib/insights";
import { getSegmentSummary } from "@/lib/segmentSummary";
import { getNicheThesis } from "@/lib/nicheThesis";
import { getNicheOpportunities } from "@/lib/nicheOpportunities";
import { tg, deepTg } from "@/lib/typo";
import { listIdeas } from "@/lib/ideas";
import { getAccess } from "@/lib/access";
import { CATEGORY_PRICE_RUB, DECK_CREDIT_RUB, CATEGORY_STARS, PREGEN_DATE_RU, PREGEN_DATE_EN } from "@/lib/tokenConfig";
import { ownsDeck } from "@/lib/unlocks";
import CategoryOffer from "@/components/CategoryOffer";
import Reveal from "@/components/Reveal";
import type { Tone } from "@/components/CardCarousel";
import SegmentExplorer, { type ExpPillar, type ExpFinding, type ExpOpp, type ExpApp, type ExpObs, type ExpQuote } from "./SegmentExplorer";
import NicheDossier from "@/components/NicheDossier";

// Categories migrated to the new dossier layout (market + audience + honest
// rating + breakdown + idea cards). Rolled out one niche at a time.
const DOSSIER_SLUGS = new Set([
  "astrology", "dating-apps", "ai-avatars-headshots", "meditation-mindfulness", "photo-editing",
  "notes-pkm", "language-learning", "period-cycle", "habit-tracking", "personal-finance", "calendars-tasks", "nutrition-calories", "crypto-investing", "music-streaming", "video-streaming", "food-delivery", "messaging-apps", "shopping-ecommerce", "ride-hailing", "weather-apps", "travel-planning", "sleep-tracking", "focus-productivity", "journaling-mood", "workout-fitness", "recipes-meal-planning", "plant-care", "baby-tracking", "ai-writing", "scanner-pdf", "ai-chatbot", "intermittent-fasting", "flashcards", "translator", "run-tracking", "voice-recorder", "resume-builder", "invoice-maker", "sobriety", "qr-scanner", "mind-mapping", "wallpapers-widgets", "water-hydration", "pet-care", "password-manager", "ai-image-generation", "car-maintenance", "wardrobe-outfit", "meal-prep-grocery",
]);

// One key finding: eyebrow index · action title · dek · the routed breakdown
// observations as quiet expandable rows (headline · count → dek + quotes).
function PillarFull({ p, label }: { p: ExpPillar; label: string }) {
  return (
    <div>
      <div className="text-footnote text-[var(--color-text-tertiary)]">{label}</div>
      <h3 className="mt-4 text-title3 text-[var(--color-text-primary)]">{tg(p.title)}</h3>
      <p className="mt-5 max-w-[62ch] text-lead text-pretty text-[var(--color-text-secondary)]">{tg(p.dek)}</p>
      {p.findings.length > 0 && (
        <div className="mt-8 border-t border-[var(--color-border-subtle)]">
          {p.findings.map((f: ExpFinding, k: number) => (
            <details key={k} className="group/f border-b border-[var(--color-border-subtle)]">
              <summary className="flex cursor-pointer list-none items-start gap-5 py-4 [&::-webkit-details-marker]:hidden">
                <span className="min-w-0 flex-1 text-body font-medium text-[var(--color-text-primary)] transition-colors group-hover/f:text-[var(--color-text-secondary)]">{tg(f.title)}</span>
                <span className="mt-0.5 shrink-0 text-footnote tabular-nums text-[var(--color-text-tertiary)]">{f.count}</span>
                <svg width="13" height="13" viewBox="0 0 12 12" fill="none" aria-hidden="true" className="mt-1.5 shrink-0 text-[var(--color-text-tertiary)] transition-transform duration-300 group-open/f:rotate-180"><path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </summary>
              <div className="details-reveal pb-6 pr-1 sm:pr-8">
                {(f.plus || f.minus) && <p className="text-callout text-[var(--color-text-secondary)]">{tg([f.plus, f.minus].filter(Boolean).join(" "))}</p>}
                {f.quotes.length > 0 && (
                  <div className="mt-5 flex flex-col gap-2.5">
                    {f.quotes.slice(0, 3).map((q, j) => (
                      <figure key={j} className="msg-bubble max-w-[92%] self-start rounded-[18px] rounded-bl-[5px] bg-[var(--color-bg-muted)] px-4 py-3">
                        <p className="text-callout italic text-[var(--color-text-secondary)]">{tg(q.text)}</p>
                        <figcaption className="mt-1.5 text-caption not-italic text-[var(--color-text-tertiary)]">{q.app}</figcaption>
                      </figure>
                    ))}
                  </div>
                )}
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}

export const dynamic = "force-dynamic";

// Canonical category page — a premium market-research report. Hero (governing
// thought + stats) is server-rendered for SEO; depth lives in modals opened from
// enticing cards (overview · three findings, idea minis, app minis), driven by
// the SegmentExplorer client component.

// SEO: target what an aspiring app-maker searches — "какое приложение сделать в
// нише X", "идеи приложений 2026". Metadata carries the keywords; the body is
// real review research (good for LLM citation).
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  if (!isActiveCategory(slug)) return {};
  const locale = await getLocale();
  const ru = locale !== "en";
  const cat = getCategoryBySlug(slug, locale);
  // ULTRA niches added straight to the people's-rating data may have no legacy
  // researchCategories entry — fall back to the rating set for name and counts
  // so their /segment pages still ship full SEO metadata.
  const rset = (RATING_BY_SLUG as Record<string, { name?: string; nameEn?: string; count?: number; totalReviews?: number }>)[slug];
  const catName = cat?.name ?? (ru ? rset?.name : rset?.nameEn ?? rset?.name);
  if (!catName) return {};
  const summary = getSegmentSummary(slug);
  const ideaCount = listIdeas().filter((i) => i.category === slug).length;
  const reviews = summary?.reviewsScanned ?? rset?.totalReviews ?? 5000;
  const appsCount = summary?.appsCount ?? rset?.count ?? 10;

  const title = ru
    ? `Идеи приложений: ${catName} — что построить в нише 2026`
    : `App ideas: ${catName} — what to build in this niche 2026`;
  const description = ru
    ? `Какое приложение сделать в нише «${catName}»? Разобрали ${appsCount} приложений и ${reviews.toLocaleString("ru-RU")} отзывов: на что злятся пользователи, чего им не хватает и какие ${ideaCount} идей напрашиваются.`
    : `What app to build in the "${catName}" niche? We analyzed ${appsCount} apps and ${reviews.toLocaleString("en-US")} reviews: what users hate, what's missing, and ${ideaCount} ideas worth building.`;

  const lp = ru ? "ru" : "en";
  const url = `https://inapp.pro/${lp}/segment/${slug}`;
  return {
    title,
    description,
    keywords: ru
      ? ["идеи приложений", "какое приложение сделать", "ниша для приложения", catName, "идея для стартапа", "анализ отзывов", "2026"]
      : ["app ideas", "what app to build", "app niche", catName, "startup idea", "review analysis", "2026"],
    alternates: {
      canonical: url,
      languages: {
        ru: `https://inapp.pro/ru/segment/${slug}`,
        en: `https://inapp.pro/en/segment/${slug}`,
        "x-default": `https://inapp.pro/en/segment/${slug}`,
      },
    },
    openGraph: { title, description, type: "article", url, siteName: "inApp", locale: ru ? "ru_RU" : "en_US", images: [`https://inapp.pro/api/og?l=${ru ? "ru" : "en"}`] },
    twitter: { card: "summary_large_image", title, description, images: [`https://inapp.pro/api/og?l=${ru ? "ru" : "en"}`] },
    robots: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  };
}

type EvLike = { app?: string; rating: number; date: string; quote: string; quoteRu?: string };
function toneOfCard(c: RegenCard): Tone {
  const p = !!c.plus?.trim();
  const m = !!c.minus?.trim();
  if (p && m) return "mixed";
  if (p) return "up";
  if (m) return "down";
  return "info";
}
const elen = (e: EvLike) => e.quote?.length ?? 0;
const evQuote = (e: EvLike, ru: boolean) => ({ app: e.app, rating: e.rating, date: e.date, text: ru ? e.quoteRu ?? e.quote : e.quote });
function orderEv(ev: EvLike[], tone: Tone, ru: boolean) {
  const pool = [...ev];
  if (tone === "down") pool.sort((a, b) => a.rating - b.rating || elen(b) - elen(a));
  else if (tone === "up") pool.sort((a, b) => b.rating - a.rating || elen(b) - elen(a));
  return pool.map((e) => evQuote(e, ru));
}
function cardToObs(c: RegenCard, ru: boolean): ExpObs {
  const tone = toneOfCard(c);
  const ordered = orderEv(c.evidence as EvLike[], tone, ru);
  return {
    title: c.title,
    plus: c.plus,
    minus: c.minus,
    count: c.count,
    tone: tone === "info" ? "up" : tone,
    evidence: ordered.map((e) => ({ app: e.app ?? "", rating: e.rating, text: e.text })),
  };
}
function findingTone(c: RegenCard): "up" | "down" | "mixed" {
  const p = !!c.plus?.trim();
  const m = !!c.minus?.trim();
  return p && m ? "mixed" : m ? "down" : "up";
}
const evQuotesOf = (c: RegenCard, ru: boolean): ExpQuote[] =>
  (c.evidence ?? []).slice(0, 5).map((e) => ({ app: e.app ?? "", rating: e.rating, text: ru ? e.quoteRu ?? e.quote : e.quote }));

// Classify a competitor's headline flaw into a strategic bucket.
const FLAW_BUCKETS: { label: string; color: string; kws: string[] }[] = [
  { label: "Платная стена", color: "#ff8585", kws: ["подписк", "плат", "деньг", "бесплат", "выкачив", "пробн", "режим", "оплат", "free", "trial", "выход за"] },
  { label: "Чужой контент", color: "#c084fc", kws: ["youtube", "ютуб", "ролик", "спикер", "контент", "чуж", "видео", "нарезк", "цитат"] },
  { label: "Точность и баги", color: "#f5b301", kws: ["подсчёт", "подсчет", "счита", "сбива", "застрева", "отмеч", "вис", "перелист", "точн", "глюк", "баг", "ошиб", "вылет", "крэш"] },
  { label: "Интерфейс", color: "#60a5fa", kws: ["интерфейс", "навигац", "устарев", "неудоб", "2005", "2010", "дизайн", "громоздк"] },
];
function flawTag(hook: string): { label: string; color: string } | null {
  const h = hook.toLowerCase();
  let best: { label: string; color: string } | null = null;
  let bs = 0;
  for (const b of FLAW_BUCKETS) {
    const sc = b.kws.reduce((s, kw) => s + (h.includes(kw) ? 1 : 0), 0);
    if (sc > bs) {
      bs = sc;
      best = { label: b.label, color: b.color };
    }
  }
  return best;
}

export default async function SegmentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = await getLocale();
  const ru = locale !== "en";

  if (DOSSIER_SLUGS.has(slug)) return <NicheDossier slug={slug} locale={locale} />;

  if (!isActiveCategory(slug)) notFound();
  const cat = getCategoryBySlug(slug, locale);
  if (!cat) notFound();
  const summary = getSegmentSummary(slug);
  if (!summary) notFound();
  const thesis = getNicheThesis(slug, locale);

  const access = await getAccess();
  const { loggedIn } = access;
  const ideas = listIdeas().filter((i) => i.category === slug);
  // Sold as one bundle: unlocking ANYTHING in the niche (incl. legacy per-chapter/
  // idea/app energy buys) opens the whole category — no granular splitting.
  const categoryUnlocked =
    access.has("category", slug) ||
    access.has("chapter", slug) ||
    ideas.some((i) => access.has("idea", i.slug)) ||
    cat.apps.some((a) => { const s = getSlugByProductId(a.productId as string); return s ? access.has("app", s) : false; });
  const catLocked = !categoryUnlocked;
  const overviewUnlocked = categoryUnlocked;

  // Every live (active) category is sellable now that all findings + idea gaps
  // are cleaned to the product-mechanism standard (no price/bug "чушь").
  const sellable = isActiveCategory(slug);
  const hasDeck = access.user ? await ownsDeck(access.user.id) : false;
  const catPrice = hasDeck ? CATEGORY_PRICE_RUB - DECK_CREDIT_RUB : CATEGORY_PRICE_RUB;
  const pregenDate = ru ? PREGEN_DATE_RU : PREGEN_DATE_EN;
  const bot = process.env.BOT_USERNAME || "inAppProBot";
  const catStarsHref = access.user ? `https://t.me/${bot}?start=cat_${access.user.id}_${slug}` : undefined;
  const catStarsLabel = `${CATEGORY_STARS} ⭐ Telegram`;
  const lifeStarsHref = access.user ? `https://t.me/${bot}?start=life_${access.user.id}` : undefined;

  const readyCount = cat.apps.filter((a) => hasInsight(a.productId)).length;
  const catProduct = (categoryCards(slug, locale)?.product ?? []).slice().sort((a, b) => b.count - a.count);
  const totalObs = catProduct.reduce((s, c) => s + c.count, 0);

  // Route breakdown cards under the thesis pillars (title weighted 2×).
  const pillars: ExpPillar[] = thesis
    ? thesis.pillars.map((p, pi) => ({
        num: `0${pi + 1}`,
        title: p.title,
        dek: p.dek,
        findings: catProduct
          .filter((c) => {
            const title = (c.title ?? "").toLowerCase();
            const body = `${c.plus ?? ""} ${c.minus ?? ""}`.toLowerCase();
            const score = (kws: string[]) => kws.reduce((s, kw) => s + (title.includes(kw) ? 2 : 0) + (body.includes(kw) ? 1 : 0), 0);
            let best = 0;
            let bs = -1;
            thesis.pillars.forEach((q, qi) => {
              const sc = score(q.match);
              if (sc > bs) {
                bs = sc;
                best = qi;
              }
            });
            return best === pi;
          })
          .slice(0, 6)
          .map((c) => ({ title: c.title, plus: c.plus, minus: c.minus, count: c.count, tone: findingTone(c), quotes: evQuotesOf(c, ru) })),
      }))
    : [];

  const regenList = getNicheOpportunities(slug, locale);
  const opps: ExpOpp[] = ideas.map((idea) => {
    const en = ideaContentEn(idea.slug, locale);
    return {
      slug: idea.slug,
      locked: catLocked,
      demand: idea.stats.observations,
      regen: regenList.find((o) => o.slug === idea.slug) ?? null,
      title: en?.title || idea.title,
      oneLiner: en?.oneLiner || idea.oneLiner,
      gap: en?.gap || idea.gap,
      pitch: en?.pitch || idea.idea.pitch,
      features: en?.features?.length ? en.features : idea.idea.features,
      monetization: en?.monetization || idea.idea.monetization,
      gapApps: [...new Set(idea.mechanisms.flatMap((m) => m.apps))].slice(0, 8),
      quotes: idea.reviewGrid.slice(0, 8).map((q) => ({ app: q.app, rating: q.rating, text: q.quote })),
    };
  });

  const apps: ExpApp[] = cat.apps
    .filter((a) => hasInsight(a.productId))
    .map((a) => {
      const pid = a.productId as string;
      const aslug = getSlugByProductId(pid);
      const cards = appCardsFor(pid, locale)?.product ?? [];
      const flaw = cards.filter((c) => c.minus?.trim()).sort((x, y) => y.count - x.count)[0];
      const ins = getProductInsights(pid);
      const hist = ins?.ratingBreakdown ?? {};
      const t = [1, 2, 3, 4, 5].reduce((s, n) => s + (hist[String(n)] ?? 0), 0);
      const avg = t > 0 ? [1, 2, 3, 4, 5].reduce((s, n) => s + n * (hist[String(n)] ?? 0), 0) / t : null;
      const hook = flaw?.minus?.trim() || flaw?.title || "";
      return {
        slug: aslug,
        name: a.name,
        icon: a.icon,
        locked: catLocked,
        avg,
        tag: flawTag(hook),
        hook,
        description: descriptionFor(pid, locale, ins?.description),
        total: cards.reduce((s, c) => s + c.count, 0) || cards.length,
        observations: cards.map((c) => cardToObs(c, ru)),
      };
    })
    .filter((a) => a.observations.length > 0);

  // Related niches — internal links boost crawl depth + ranking. Prefer
  // same-domain siblings, then fill from other live niches.
  const isLive = (s: string) => isActiveCategory(s) && !!getSegmentSummary(s);
  const allDomains = listDomains(locale);
  const myDomain = allDomains.find((d) => d.categories.some((c) => c.slug === slug));
  const related: { slug: string; name: string }[] = [];
  for (const c of myDomain?.categories ?? []) {
    if (c.slug !== slug && isLive(c.slug)) related.push({ slug: c.slug, name: c.name });
  }
  for (const d of allDomains) {
    for (const c of d.categories) {
      if (related.length >= 6) break;
      if (c.slug !== slug && isLive(c.slug) && !related.some((r) => r.slug === c.slug)) related.push({ slug: c.slug, name: c.name });
    }
  }
  const relatedTop = related.slice(0, 6);

  const nf = (n: number) => n.toLocaleString(ru ? "ru-RU" : "en-US");
  const stats = [
    { n: `${readyCount || cat.apps.length}`, l: ru ? "приложений" : "apps" },
    { n: nf(summary.reviewsScanned), l: ru ? "отзывов" : "reviews" },
    { n: nf(totalObs), l: ru ? "наблюдений" : "observations" },
    { n: `${opps.length}`, l: ru ? "возможностей" : "opportunities" },
  ];

  // ── Schema.org @graph — rich structured data for search + LLM grounding ──
  const localePrefix = ru ? "ru" : "en";
  const pageUrl = `https://inapp.pro/${localePrefix}/segment/${slug}`;
  const org = { "@type": "Organization", name: "inApp", url: "https://inapp.pro" };

  // Each analysed app as a SoftwareApplication with a real AggregateRating.
  const appSchemas = cat.apps
    .filter((a) => hasInsight(a.productId))
    .map((a) => {
      const pid = a.productId as string;
      const ins = getProductInsights(pid);
      const hist = ins?.ratingBreakdown ?? {};
      const cnt = [1, 2, 3, 4, 5].reduce((s, n) => s + (hist[String(n)] ?? 0), 0);
      const avg = cnt > 0 ? [1, 2, 3, 4, 5].reduce((s, n) => s + n * (hist[String(n)] ?? 0), 0) / cnt : 0;
      if (!cnt || !avg) return null;
      const desc = descriptionFor(pid, locale, ins?.description);
      return {
        "@type": "SoftwareApplication",
        name: a.name,
        applicationCategory: "MobileApplication",
        operatingSystem: "iOS, Android",
        ...(desc ? { description: desc } : {}),
        ...(a.icon ? { image: a.icon } : {}),
        aggregateRating: { "@type": "AggregateRating", ratingValue: Math.round(avg * 10) / 10, ratingCount: cnt, bestRating: 5, worstRating: 1 },
      } as Record<string, unknown>;
    })
    .filter((x): x is Record<string, unknown> => x !== null);

  // FAQ from the authored research — matches real search intent + LLM Q&A.
  const faqItems = thesis
    ? [
        { q: ru ? `Что пользователи ценят и на что злятся в приложениях «${cat.name}»?` : `What do users love and hate in ${cat.name} apps?`, a: tg(thesis.governing) },
        thesis.competitorRead ? { q: ru ? `Чего не хватает приложениям «${cat.name}»?` : `What are ${cat.name} apps missing?`, a: tg(thesis.competitorRead) } : null,
        opps.length ? { q: ru ? `Какое приложение сделать в нише «${cat.name}»?` : `What app to build in the "${cat.name}" niche?`, a: (ru ? `${opps.length} идей под подтверждённый спрос: ` : `${opps.length} ideas backed by proven demand: `) + opps.map((o) => o.regen?.title || o.title).filter(Boolean).join("; ") } : null,
      ].filter((x): x is { q: string; a: string } => !!x)
    : [];

  const graph: Record<string, unknown>[] = [
    {
      "@type": "Article",
      headline: ru ? `Идеи приложений: ${cat.name} — что построить в нише 2026` : `App ideas: ${cat.name} — what to build in 2026`,
      inLanguage: ru ? "ru" : "en",
      about: cat.name,
      keywords: ru ? `идеи приложений, какое приложение сделать, ниша для приложения, ${cat.name}` : `app ideas, what app to build, app niche, ${cat.name}`,
      author: org,
      publisher: org,
      mainEntityOfPage: pageUrl,
      // Paywalled-content signal: the gated synthesis is in the HTML, not free.
      isAccessibleForFree: false,
      hasPart: { "@type": "WebPageElement", isAccessibleForFree: false, cssSelector: ".gated-content" },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: ru ? "Главная" : "Home", item: `https://inapp.pro/${localePrefix}` },
        { "@type": "ListItem", position: 2, name: cat.name, item: pageUrl },
      ],
    },
    {
      "@type": "ItemList",
      name: ru ? `Идеи приложений: ${cat.name}` : `App ideas: ${cat.name}`,
      numberOfItems: ideas.length,
      itemListElement: ideas.map((idea, i) => ({ "@type": "ListItem", position: i + 1, name: ru ? `Идея №${i + 1} · спрос ${idea.stats.observations}` : `Idea #${i + 1} · demand ${idea.stats.observations}`, url: pageUrl })),
    },
    ...appSchemas,
    ...(faqItems.length ? [{ "@type": "FAQPage", mainEntity: faqItems.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }] : []),
  ];
  const jsonLd = { "@context": "https://schema.org", "@graph": graph };

  const findingLabel = (i: number) => (ru ? `Вывод ${`0${i + 1}`}` : `Finding ${`0${i + 1}`}`);

  return (
    <main className="relative mx-auto w-full max-w-[720px] overflow-x-clip px-4 sm:px-6 pb-28 pt-16 sm:pt-24">
      <AtmosphereSetter hue={hueFromSlug(slug)} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <Link href="/" className="inline-flex items-center gap-1.5 text-footnote text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-text-secondary)]">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M10 3.25 5.25 8 10 12.75" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        {ru ? "Все ниши" : "All niches"}
      </Link>

      {/* HERO */}
      <header className="ld-fade mt-12">
        <div className="text-footnote text-[var(--color-text-tertiary)]">{isUltra(slug) ? (ru ? "Разобрано ультра" : "Ultra-analyzed") : ru ? "Исследование ниши" : "Niche research"}</div>
        <h1 className="glow-sweep mt-6 text-display text-[var(--color-text-primary)] text-balance">{cat.name}</h1>
        {thesis ? (
          <p className="mt-8 max-w-[58ch] text-title3 text-pretty text-[var(--color-text-secondary)]">{tg(thesis.governing)}</p>
        ) : (
          summary.lead && <p className="mt-8 max-w-[58ch] text-headline text-pretty text-[var(--color-text-secondary)]">{tg(summary.lead)}</p>
        )}
        {hasPeoplesRating(slug) && (
          <Link href={`/${ru ? "ru" : "en"}/rating/${slug}`} className="group mt-7 inline-flex items-center gap-2 rounded-full border border-[var(--color-border-subtle)] px-4 py-2 text-callout font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]">
            {ru ? `Народный рейтинг: ${summary.appsCount} приложений по отзывам` : `People's rating: ${summary.appsCount} apps by reviews`}
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="text-[var(--color-text-tertiary)] transition-transform group-hover:translate-x-0.5"><path d="M6 3.25 10.75 8 6 12.75" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </Link>
        )}

        {/* STATS — borderless big-number band */}
        <div className="mt-14 flex flex-wrap gap-x-12 gap-y-8">
          {stats.map((s, i) => (
            <div key={i} className="flex flex-col">
              <span className="text-stat tabular-nums text-[var(--color-text-primary)]">{s.n}</span>
              <span className="mt-2.5 text-footnote text-[var(--color-text-tertiary)]">{s.l}</span>
            </div>
          ))}
        </div>
      </header>

      {/* KEY FINDINGS — inline: first free, the other two unlock for energy */}
      {pillars.length > 0 && (
        <Reveal className="mt-20 sm:mt-28">
          <section>
            <div className="text-footnote text-[var(--color-text-tertiary)]">{ru ? "Главное" : "Key findings"}</div>
            <h2 className="mt-4 text-title2 text-[var(--color-text-primary)]">{ru ? "Три вывода" : "Three findings"}</h2>

            <div className="mt-12 flex flex-col gap-12 sm:gap-16">
              <PillarFull p={pillars[0]} label={findingLabel(0)} />
              {overviewUnlocked ? (
                pillars.slice(1).map((p, i) => <PillarFull key={i} p={p} label={findingLabel(i + 1)} />)
              ) : (
                <div className="pt-2">
                  {/* Findings 02/03 stay in the DOM for crawlers (paywalled-content,
                      isAccessibleForFree) but collapsed to zero height — no tall
                      blurred sheet to scroll past. Just a compact unlock card. */}
                  <div className="gated-content max-h-0 select-none overflow-hidden opacity-0" aria-hidden="true">
                    {pillars.slice(1).map((p, i) => (
                      <PillarFull key={i} p={p} label={findingLabel(i + 1)} />
                    ))}
                  </div>
                  <CategoryOffer slug={slug} categoryName={cat.name} sellable={sellable} price={catPrice} loggedIn={loggedIn} pregenDate={pregenDate} locale={locale} ideasCount={opps.length} appsCount={apps.length} starsHref={catStarsHref} starsLabel={catStarsLabel} lifetimeStarsHref={lifeStarsHref} />
                </div>
              )}
            </div>
          </section>
        </Reveal>
      )}

      <SegmentExplorer
        locale={locale}
        slug={slug}
        categoryName={cat.name}
        opps={deepTg(opps)}
        apps={deepTg(apps)}
        competitorRead={thesis?.competitorRead ? tg(thesis.competitorRead) : undefined}
        loggedIn={loggedIn}
        sellable={sellable}
        price={catPrice}
        pregenDate={pregenDate}
        starsHref={catStarsHref}
        starsLabel={catStarsLabel}
      />

      {relatedTop.length > 0 && (
        <section className="mt-20 border-t border-[var(--color-border-subtle)] pt-10 sm:mt-28">
          <h2 className="text-subhead text-[var(--color-text-primary)]">{ru ? "Похожие ниши" : "Related niches"}</h2>
          <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {relatedTop.map((r) => (
              <Link key={r.slug} href={`/segment/${r.slug}`} className="flex items-center rounded-[14px] border border-[var(--color-border-subtle)] px-4 py-3.5 transition-colors hover:border-[var(--color-border-strong)]">
                <span className="text-callout font-medium text-[var(--color-text-primary)]">{r.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
