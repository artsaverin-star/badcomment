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
import { tg, deepTg } from "@/lib/typo";
import { listIdeas } from "@/lib/ideas";
import { getAccess } from "@/lib/access";
import { UNLOCK_COST } from "@/lib/tokenConfig";
import EnergyUnlockButton from "@/components/EnergyUnlockButton";
import Reveal from "@/components/Reveal";
import type { Tone } from "@/components/CardCarousel";
import SegmentExplorer, { type ExpPillar, type ExpFinding, type ExpOpp, type ExpApp, type ExpObs, type ExpQuote } from "./SegmentExplorer";

// One key finding: eyebrow index · action title · dek · the routed breakdown
// observations as quiet expandable rows (headline · count → dek + quotes).
function PillarFull({ p, label }: { p: ExpPillar; label: string }) {
  return (
    <div>
      <div className="text-[13px] font-medium uppercase tracking-[0.18em] text-[var(--color-text-tertiary)]">{label}</div>
      <h3 className="mt-4 text-[27px] font-semibold leading-[1.12] tracking-[-0.025em] text-[var(--color-text-primary)] sm:text-[34px]">{tg(p.title)}</h3>
      <p className="mt-5 max-w-[62ch] text-[17px] leading-[1.65] text-pretty text-[var(--color-text-secondary)] sm:text-[18px]">{tg(p.dek)}</p>
      {p.findings.length > 0 && (
        <div className="mt-8 border-t border-[var(--color-border-subtle)]">
          {p.findings.map((f: ExpFinding, k: number) => (
            <details key={k} className="group/f border-b border-[var(--color-border-subtle)]">
              <summary className="flex cursor-pointer list-none items-start gap-5 py-4 [&::-webkit-details-marker]:hidden">
                <span className="min-w-0 flex-1 text-[16px] font-medium leading-[1.45] text-[var(--color-text-primary)] transition-colors group-hover/f:text-[var(--color-text-secondary)]">{tg(f.title)}</span>
                <span className="mt-0.5 shrink-0 text-[13px] tabular-nums text-[var(--color-text-tertiary)]">{f.count}</span>
                <svg width="13" height="13" viewBox="0 0 12 12" fill="none" aria-hidden="true" className="mt-1.5 shrink-0 text-[var(--color-text-tertiary)] transition-transform duration-300 group-open/f:rotate-180"><path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </summary>
              <div className="details-reveal pb-6 pr-1 sm:pr-8">
                {(f.plus || f.minus) && <p className="text-[15px] leading-[1.65] text-[var(--color-text-secondary)]">{tg([f.plus, f.minus].filter(Boolean).join(" "))}</p>}
                {f.quotes.length > 0 && (
                  <div className="mt-5 flex flex-col gap-2.5">
                    {f.quotes.slice(0, 3).map((q, j) => (
                      <figure key={j} className="rounded-[16px] bg-[var(--color-bg-muted)] px-4 py-3">
                        <p className="text-[14px] leading-[1.55] text-[var(--color-text-secondary)]">{tg(q.text)}</p>
                        <figcaption className="mt-1.5 text-[12px] text-[var(--color-text-tertiary)]">{q.app}</figcaption>
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

  if (!isActiveCategory(slug)) notFound();
  const cat = getCategoryBySlug(slug, locale);
  if (!cat) notFound();
  const summary = getSegmentSummary(slug);
  if (!summary) notFound();
  const thesis = getNicheThesis(slug, locale);

  const access = await getAccess();
  const { loggedIn, balance } = access;
  const catLocked = !access.has("category", slug);
  // Overview: first finding free, the other two unlock inline for energy.
  const overviewUnlocked = !catLocked || access.has("chapter", slug);

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

  const regenList = getNicheOpportunities(slug, locale);
  const opps: ExpOpp[] = ideas.map((idea) => {
    const en = ideaContentEn(idea.slug, locale);
    return {
      slug: idea.slug,
      locked: catLocked && !access.has("idea", idea.slug),
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
        locked: catLocked && !(aslug ? access.has("app", aslug) : false),
        avg,
        tag: flawTag(hook),
        hook,
        description: descriptionFor(pid, locale, ins?.description),
        total: cards.reduce((s, c) => s + c.count, 0) || cards.length,
        observations: cards.map((c) => cardToObs(c, ru)),
      };
    })
    .filter((a) => a.observations.length > 0);

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

  const findingLabel = (i: number) => (ru ? `Вывод ${`0${i + 1}`}` : `Finding ${`0${i + 1}`}`);

  return (
    <main className="relative mx-auto w-full max-w-[720px] overflow-x-clip px-6 pb-28 pt-16 sm:pt-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <Link href="/" className="text-[13px] text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-text-secondary)]">
        ← {ru ? "Все ниши" : "All niches"}
      </Link>

      {/* HERO */}
      <header className="ld-fade mt-12">
        <div className="text-[13px] font-medium uppercase tracking-[0.22em] text-[var(--color-text-tertiary)]">{ru ? "Исследование ниши" : "Niche research"}</div>
        <h1 className="mt-6 text-[clamp(46px,12vw,84px)] font-semibold leading-[0.96] tracking-[-0.045em] text-[var(--color-text-primary)]">{cat.name}</h1>
        {thesis ? (
          <p className="mt-8 max-w-[58ch] text-[21px] font-light leading-[1.45] text-pretty text-[var(--color-text-secondary)] sm:text-[27px]">{tg(thesis.governing)}</p>
        ) : (
          summary.lead && <p className="mt-8 max-w-[58ch] text-[19px] font-light leading-[1.5] text-pretty text-[var(--color-text-secondary)] sm:text-[23px]">{tg(summary.lead)}</p>
        )}

        {/* STATS — borderless big-number band */}
        <div className="mt-14 flex flex-wrap gap-x-12 gap-y-8">
          {stats.map((s, i) => (
            <div key={i} className="flex flex-col">
              <span className="text-[40px] font-semibold leading-none tracking-[-0.03em] tabular-nums text-[var(--color-text-primary)] sm:text-[46px]">{s.n}</span>
              <span className="mt-2.5 text-[13px] text-[var(--color-text-tertiary)]">{s.l}</span>
            </div>
          ))}
        </div>
      </header>

      {/* KEY FINDINGS — inline: first free, the other two unlock for energy */}
      {pillars.length > 0 && (
        <Reveal className="mt-20 sm:mt-28">
          <section>
            <div className="text-[13px] font-medium uppercase tracking-[0.22em] text-[var(--color-text-tertiary)]">{ru ? "Главное" : "Key findings"}</div>
            <h2 className="mt-4 text-[34px] font-semibold leading-[1.05] tracking-[-0.035em] text-[var(--color-text-primary)] sm:text-[46px]">{ru ? "Три вывода" : "Three findings"}</h2>

            <div className="mt-12 flex flex-col gap-12 sm:gap-16">
              <PillarFull p={pillars[0]} label={findingLabel(0)} />
              {overviewUnlocked ? (
                pillars.slice(1).map((p, i) => <PillarFull key={i} p={p} label={findingLabel(i + 1)} />)
              ) : (
                <div className="pt-4">
                  {/* Withhold the payload — the finding titles ARE the insight, so
                      show locked placeholders, not the real text. */}
                  <div className="flex flex-col gap-10">
                    {pillars.slice(1).map((p, i) => (
                      <div key={i} aria-hidden>
                        <div className="flex items-center gap-2 text-[13px] font-medium uppercase tracking-[0.18em] text-[var(--color-text-tertiary)]">
                          {findingLabel(i + 1)}
                          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" className="text-[var(--color-text-tertiary)]" aria-hidden="true">
                            <rect x="3.5" y="7" width="9" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                            <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" strokeWidth="1.3" />
                          </svg>
                        </div>
                        <div className="mt-4 flex flex-col gap-2.5">
                          <div className="h-6 rounded-md bg-[var(--color-bg-muted)]" style={{ width: i ? "72%" : "88%" }} />
                          <div className="h-6 rounded-md bg-[var(--color-bg-muted)]" style={{ width: i ? "48%" : "60%" }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-10 flex flex-col items-start">
                    <EnergyUnlockButton type="chapter" slug={slug} cost={UNLOCK_COST.chapter} loggedIn={loggedIn} balance={balance} locale={locale} label={ru ? "Открыть 2 вывода" : "Unlock 2 findings"} />
                  </div>
                </div>
              )}
            </div>
          </section>
        </Reveal>
      )}

      <SegmentExplorer
        locale={locale}
        opps={deepTg(opps)}
        apps={deepTg(apps)}
        competitorRead={thesis?.competitorRead ? tg(thesis.competitorRead) : undefined}
        loggedIn={loggedIn}
        balance={balance}
      />
    </main>
  );
}
