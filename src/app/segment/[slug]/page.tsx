import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getCategoryBySlug } from "@/lib/researchCategories";
import { getSlugByProductId } from "@/lib/appSlugs";
import { hasInsight } from "@/lib/readyApps";
import { isActiveCategory } from "@/lib/categoryVisibility";
import { getLocale } from "@/lib/i18n.server";
import { appCardsFor, categoryCards, ideaContentEn, descriptionFor, type RegenCard } from "@/lib/regenCards";
import { getProductInsights } from "@/lib/insights";
import { getSegmentSummary } from "@/lib/segmentSummary";
import { getNicheThesis } from "@/lib/nicheThesis";
import { getNicheOpportunities } from "@/lib/nicheOpportunities";
import { listIdeas } from "@/lib/ideas";
import { getAccess } from "@/lib/access";
import type { Slide, Tone } from "@/components/CardCarousel";
import SegmentExplorer, { type ExpPillar, type ExpOpp, type ExpApp, type ExpFlaw, type ExpQuote } from "./SegmentExplorer";

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
function cardToSlide(c: RegenCard, ru: boolean): Slide {
  const tone = toneOfCard(c);
  const ordered = orderEv(c.evidence as EvLike[], tone, ru);
  return { kind: "insight", kicker: c.kicker, title: c.title, plus: c.plus, minus: c.minus, count: c.count, tone, quote: ordered[0], evidence: ordered };
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

  if (!isActiveCategory(slug)) notFound();
  const cat = getCategoryBySlug(slug, locale);
  if (!cat) notFound();
  const summary = getSegmentSummary(slug);
  if (!summary) notFound();
  const thesis = getNicheThesis(slug);

  const access = await getAccess();
  const { loggedIn, balance } = access;
  const catLocked = !access.has("category", slug);

  const readyCount = cat.apps.filter((a) => hasInsight(a.productId)).length;
  const ideas = listIdeas().filter((i) => i.category === slug);
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

  const regenList = ru ? getNicheOpportunities(slug) : [];
  const opps: ExpOpp[] = ideas.map((idea) => {
    const en = ideaContentEn(idea.slug, locale);
    return {
      slug: idea.slug,
      locked: catLocked && !access.has("idea", idea.slug),
      demand: idea.stats.observations,
      regen: regenList.find((o) => o.src === idea.title) ?? null,
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
        locked: catLocked && !(aslug ? access.has("app", aslug) : false),
        avg,
        tag: flawTag(hook),
        hook,
        description: descriptionFor(pid, locale, ins?.description),
        total: cards.reduce((s, c) => s + c.count, 0) || cards.length,
        slides: cards.map((c) => cardToSlide(c, ru)),
      };
    })
    .filter((a) => a.slides.length > 0);

  const flawDist: ExpFlaw[] = (() => {
    const m = new Map<string, { color: string; n: number }>();
    apps.forEach((a) => {
      if (!a.tag) return;
      const cur = m.get(a.tag.label) ?? { color: a.tag.color, n: 0 };
      cur.n += 1;
      m.set(a.tag.label, cur);
    });
    return [...m.entries()].map(([label, v]) => ({ label, ...v })).sort((x, y) => y.n - x.n);
  })();

  const nf = (n: number) => n.toLocaleString(ru ? "ru-RU" : "en-US");
  const stats = [
    { n: `${readyCount}`, l: ru ? "приложений" : "apps" },
    { n: nf(summary.reviewsScanned), l: ru ? "отзывов" : "reviews" },
    { n: nf(totalObs), l: ru ? "наблюдений" : "observations" },
    { n: `${opps.length}`, l: ru ? "возможностей" : "opportunities" },
  ];

  // Schema.org — research article with a list of (gated) app ideas.
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
        name: ru ? `Идея №${i + 1} · спрос ${idea.stats.observations} наблюдений` : `Idea #${i + 1} · demand ${idea.stats.observations} observations`,
        url: `https://inapp.pro/${ru ? "ru" : "en"}/ideas/${idea.slug}`,
      })),
    },
  };

  return (
    <main className="mx-auto w-full max-w-[760px] px-5 py-12 sm:py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <Link href="/" className="text-footnote text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-text-secondary)]">
        ← {ru ? "Все ниши" : "All niches"}
      </Link>

      {/* HERO */}
      <header className="mt-10">
        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-text-tertiary)]">{ru ? "Исследование ниши · 2026" : "Niche research · 2026"}</div>
        <h1 className="mt-3 text-[44px] font-bold leading-[1.02] tracking-[-0.03em] text-[var(--color-text-primary)] sm:text-[64px]">{cat.name}</h1>
        {thesis ? (
          <p className="mt-6 max-w-[60ch] text-[20px] font-medium leading-[1.45] text-[var(--color-text-primary)] sm:text-[24px]">{thesis.governing}</p>
        ) : (
          summary.lead && <p className="mt-6 max-w-[60ch] text-[18px] leading-[1.55] text-[var(--color-text-secondary)]">{summary.lead}</p>
        )}
      </header>

      {/* STATS */}
      <div className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-[20px] border border-[var(--color-border-subtle)] bg-[var(--color-border-subtle)] sm:grid-cols-4">
        {stats.map((s, i) => (
          <div key={i} className="flex flex-col gap-1 bg-[var(--color-bg-page)] px-5 py-5">
            <span className="text-[26px] font-bold leading-none tabular-nums tracking-tight text-[var(--color-text-primary)]">{s.n}</span>
            <span className="text-caption text-[var(--color-text-tertiary)]">{s.l}</span>
          </div>
        ))}
      </div>

      <SegmentExplorer
        locale={locale}
        pillars={pillars}
        opps={opps}
        apps={apps}
        competitorRead={thesis?.competitorRead}
        flawDist={flawDist}
        loggedIn={loggedIn}
        balance={balance}
      />
    </main>
  );
}
