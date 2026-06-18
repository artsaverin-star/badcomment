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

// ── Assign ideas/apps to chapters by text overlap with the chapter's theme ──
const STOP = new Set([
  "это","что","как","для","или","при","без","там","себя","свой","свои","того","этот","эта","эти","нет","все","всё","они","она","оно","его","еще","ещё",
  "когда","потом","тоже","быть","есть","были","было","будет","того","чтобы","который","которые","которая","можно","надо","раз","два","три","app","the","and","for","with",
]);
function tokenize(s: string): string[] {
  return (s || "")
    .toLowerCase()
    .split(/[^a-zа-яё0-9]+/i)
    .filter((w) => w.length >= 4 && !STOP.has(w));
}
// Greedy best-match assignment with a per-chapter cap so each chapter gets a
// balanced handful (every item lands somewhere — best available chapter).
function assignToChapters(itemTokens: string[][], chapterVocab: Set<string>[], cap: number): number[] {
  const n = chapterVocab.length;
  const score = (toks: string[], v: Set<string>) => toks.reduce((s, t) => s + (v.has(t) ? 1 : 0), 0);
  const best = itemTokens.map((toks) => Math.max(0, ...chapterVocab.map((v) => score(toks, v))));
  const order = itemTokens.map((_, i) => i).sort((a, b) => best[b] - best[a]);
  const counts = new Array(n).fill(0);
  const out = new Array(itemTokens.length).fill(0);
  for (const i of order) {
    const ranked = [...Array(n).keys()].sort((x, y) => score(itemTokens[i], chapterVocab[y]) - score(itemTokens[i], chapterVocab[x]));
    let placed = -1;
    for (const c of ranked) if (counts[c] < cap) { placed = c; break; }
    if (placed === -1) placed = counts.indexOf(Math.min(...counts));
    out[i] = placed;
    counts[placed]++;
  }
  return out;
}

type IdeaView = { slug: string; title: string; oneLiner: string; gap: string; pitch: string; features: string[]; observations: number };
type AppView = {
  name: string; icon: string | null; slug: string | null; description?: string;
  avgRating: number | null; ratingCount: number | null; reviewsScanned: number; observations: number; hook: string; total: number; slides: Slide[];
};

// A ready-product idea card — chapter-style (lightbulb salute). Substance is
// hidden until the chapter is unlocked.
function IdeaArticle({ idea, n, ru, locale, loggedIn, balance, unlocked }: { idea: IdeaView; n: number; ru: boolean; locale: Locale; loggedIn: boolean; balance: number; unlocked: boolean }) {
  return (
    <article className="relative overflow-hidden rounded-[28px] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-6 shadow-[0_20px_50px_-30px_rgba(0,0,0,0.7)] sm:p-7">
      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-32 opacity-[0.18]" style={{ background: "radial-gradient(120% 90% at 50% 0%, var(--color-text-brand) 0%, transparent 70%)" }} />
      <div aria-hidden className="pointer-events-none absolute inset-0 text-[var(--color-text-brand)]">
        {SALUTE_POS.map((pos, k) => (
          <span key={k} className={`ld-float absolute block opacity-[0.16] ${k % 3 === 0 ? "size-11" : "size-9"} ${pos}`} style={{ ["--d" as string]: `${4.5 + (k % 5) * 0.7}s`, ["--r" as string]: `${k % 2 ? 7 : -7}deg`, animationDelay: `${(k % 6) * 0.25}s` }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="size-full">
              <path d={IDEA_GLYPHS[k % IDEA_GLYPHS.length]} />
            </svg>
          </span>
        ))}
        <span className="absolute inset-0" style={{ background: "radial-gradient(72% 62% at 50% 45%, var(--color-surface-card) 28%, transparent 100%)" }} />
      </div>
      <div className="relative">
        <span className="text-caption font-bold uppercase tracking-[0.12em] text-[var(--color-text-brand)]">
          {ru ? `Идея №${n} · спрос ${idea.observations} наблюдений` : `Idea #${n} · demand ${idea.observations} observations`}
        </span>
        {unlocked ? (
          <>
            <h3 className="mt-3 text-[24px] font-bold leading-[1.15] tracking-[-0.01em] text-[var(--color-text-primary)] sm:text-[27px]">{idea.title}</h3>
            <p className="mt-2 text-callout leading-relaxed text-[var(--color-text-secondary)]">{idea.oneLiner}</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
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
                {idea.features.slice(0, 6).map((f, j) => (
                  <span key={j} className="rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] px-2.5 py-1 text-caption text-[var(--color-text-secondary)]">{f}</span>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="mt-1 flex flex-col gap-2" aria-hidden>
              <div className="h-5 w-3/4 rounded bg-[color-mix(in_srgb,var(--color-text-primary)_12%,transparent)]" />
              <div className="h-3.5 w-full rounded bg-[color-mix(in_srgb,var(--color-text-primary)_8%,transparent)]" />
              <div className="h-3.5 w-2/3 rounded bg-[color-mix(in_srgb,var(--color-text-primary)_8%,transparent)]" />
            </div>
            <p className="mt-3 text-footnote leading-relaxed text-[var(--color-text-secondary)]">
              {ru ? `Готовый продукт под подтверждённый спрос — ${idea.observations} наблюдений. Внутри этой главы.` : `A ready product for proven demand — ${idea.observations} observations. Inside this chapter.`}
            </p>
            <div className="mt-4">
              <EnergyUnlockButton type="idea" slug={idea.slug} cost={UNLOCK_COST.idea} loggedIn={loggedIn} balance={balance} locale={locale} label={ru ? "Открыть только идею" : "Unlock idea only"} />
            </div>
          </>
        )}
      </div>
    </article>
  );
}

// A beautiful app cover card; expands (when its chapter is unlocked) into the
// app's full review breakdown.
function AppCard({ app, id, ru, locale }: { app: AppView; id: string; ru: boolean; locale: Locale }) {
  const glow = <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-32 opacity-[0.18]" style={{ background: "radial-gradient(120% 90% at 50% 0%, var(--color-text-brand) 0%, transparent 70%)" }} />;
  const iconEl = app.icon ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={app.icon} alt="" loading="lazy" decoding="async" className="size-[64px] rounded-[18px] shadow-[0_12px_36px_-12px_rgba(0,0,0,0.6)]" />
  ) : (
    <div className="size-[64px] rounded-[18px] bg-[var(--color-bg-muted)]" />
  );
  return (
    <details id={id} className="group scroll-mt-28 overflow-hidden rounded-[24px] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)]">
      <summary className="relative cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        {glow}
        <span className="absolute right-4 top-4 z-10 flex size-7 items-center justify-center rounded-full bg-[var(--color-bg-muted)] text-[var(--color-text-secondary)] transition-transform group-open:rotate-180">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <div className="relative flex flex-col items-center gap-2.5 px-5 pb-5 pt-7 text-center">
          {iconEl}
          <h4 className="text-[20px] font-bold leading-tight tracking-[-0.01em] text-[var(--color-text-primary)]">{app.name}</h4>
          {app.description && <p className="mx-auto max-w-[40ch] text-footnote leading-relaxed text-[var(--color-text-secondary)]">{app.description}</p>}
          {app.avgRating != null && (
            <div className="text-caption tabular-nums text-[var(--color-text-tertiary)]">
              <span className="text-[#f5b301]">{"★".repeat(Math.round(app.avgRating))}{"☆".repeat(Math.max(0, 5 - Math.round(app.avgRating)))}</span>
              {" "}{app.avgRating.toFixed(1)}{app.ratingCount != null ? ` · ${app.ratingCount.toLocaleString(ru ? "ru-RU" : "en-US")}` : ""}
            </div>
          )}
          <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-[var(--color-bg-muted)] px-3 py-1.5 text-caption font-semibold text-[var(--color-text-secondary)] transition-colors group-hover:text-[var(--color-text-primary)]">
            {ru ? `Смотреть ${app.total} наблюдений` : `View ${app.total} observations`}
          </span>
        </div>
      </summary>
      <div className="details-reveal border-t border-[var(--color-border-subtle)] p-3 sm:p-4">
        <CardCarousel slides={app.slides} locale={ru ? "ru" : "en"} layout="feed" />
      </div>
    </details>
  );
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
  const ideaViews: IdeaView[] = ideas.map((idea) => {
    const en = ideaContentEn(idea.slug, locale);
    return {
      slug: idea.slug,
      title: en?.title || idea.title,
      oneLiner: en?.oneLiner || idea.oneLiner,
      gap: en?.gap || idea.gap,
      pitch: en?.pitch || idea.idea.pitch,
      features: en?.features?.length ? en.features : idea.idea.features,
      observations: idea.stats.observations,
    };
  });
  const appViews: AppView[] = cat.apps
    .filter((a) => hasInsight(a.productId))
    .map((a) => {
      const pid = a.productId as string;
      const cards = appCardsFor(pid, locale)?.product ?? [];
      const flawCard = cards.filter((c) => c.minus?.trim()).sort((x, y) => y.count - x.count)[0];
      const ins = getProductInsights(pid);
      const hist = ins?.ratingBreakdown ?? {};
      const histTotal = [1, 2, 3, 4, 5].reduce((s, n) => s + (hist[String(n)] ?? 0), 0);
      const avg = histTotal > 0 ? [1, 2, 3, 4, 5].reduce((s, n) => s + n * (hist[String(n)] ?? 0), 0) / histTotal : null;
      return {
        name: a.name,
        icon: a.icon,
        slug: getSlugByProductId(pid),
        description: descriptionFor(pid, locale, ins?.description),
        avgRating: avg,
        ratingCount: histTotal || null,
        reviewsScanned: ins?.reviewsScanned ?? 500,
        observations: cards.reduce((s, c) => s + c.count, 0) || cards.length,
        hook: flawCard?.minus?.trim() || flawCard?.title || "",
        total: cards.length,
        slides: cards.map(cardToSlide),
      };
    })
    .filter((a) => a.total > 0);

  // ── Chapters: each authored theme + the ideas & apps it implies, sold as a
  // unit. Ch.1 is free; the rest unlock individually (or all via category). ──
  const nSec = sections.length;
  const chapterVocab = sections.map((sec) => new Set([...tokenize(sec.heading), ...sec.items.flatMap((it) => [...tokenize(it.title), ...tokenize(it.body)])]));
  const ideaAssign = nSec ? assignToChapters(ideaViews.map((iv) => [...tokenize(iv.title), ...tokenize(iv.gap), ...tokenize(iv.pitch), ...tokenize(iv.oneLiner)]), chapterVocab, Math.ceil(ideaViews.length / nSec)) : [];
  const appAssign = nSec ? assignToChapters(appViews.map((av) => [...tokenize(av.hook), ...tokenize(av.name)]), chapterVocab, Math.ceil(appViews.length / nSec)) : [];

  const chapters = nSec
    ? sections.map((sec, i) => {
        const conclusion: Slide[] = sec.items.map((item) => {
          const tone = toneOfEv(item.evidence as SegmentSummaryEvidence[]);
          const ordered = orderEv(item.evidence as EvLike[], tone, ru);
          return { kind: "insight", title: item.title, body: item.body, count: item.observationCount, tone, quote: ordered[0], evidence: ordered };
        });
        const chIdeas = ideaViews.filter((_, idx) => ideaAssign[idx] === i);
        const chApps = appViews.filter((_, idx) => appAssign[idx] === i);
        const chapterSlug = `${slug}__ch${i + 1}`;
        const free = i === 0;
        const unlocked = !catLocked || free || access.has("chapter", chapterSlug);
        return { i, slug: chapterSlug, heading: sec.heading, dek: sec.dek, conclusion, ideas: chIdeas, apps: chApps, free, unlocked };
      })
    : [
        // No authored narrative — one open chapter with all apps & ideas.
        {
          i: 0,
          slug: `${slug}__ch1`,
          heading: ru ? "Разбор категории" : "Category breakdown",
          dek: summary.lead || (ru ? "Что общего у приложений ниши и что можно построить." : "What the niche's apps share and what to build."),
          conclusion: [] as Slide[],
          ideas: ideaViews,
          apps: appViews,
          free: true,
          unlocked: true,
        },
      ];

  const nav = chapters.map((_, i) => ({ h: `#ch-${i}`, label: ru ? `Глава ${i + 1}` : `Chapter ${i + 1}` }));

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

      {/* Chapters — each a coherent theme bundle (conclusion + apps + ideas) */}
      {chapters.map((ch) => (
        <section key={ch.i} id={`ch-${ch.i}`} className="mt-10 scroll-mt-28">
          <div className="mx-auto max-w-[640px]">
            <div className="relative overflow-hidden rounded-[28px] border border-[color-mix(in_srgb,var(--color-text-brand)_24%,var(--color-border-subtle))] bg-[var(--color-surface-card)] p-6 shadow-[0_20px_50px_-30px_rgba(0,0,0,0.7)] sm:p-8">
              <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-40 opacity-[0.2]" style={{ background: "radial-gradient(120% 80% at 50% 0%, var(--color-text-brand) 0%, transparent 70%)" }} />
              <div className="relative">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="text-caption font-bold uppercase tracking-[0.12em] text-[var(--color-text-brand)]">
                    {ru ? `Глава ${ch.i + 1} · ${chapters.length}` : `Chapter ${ch.i + 1} · ${chapters.length}`}
                  </span>
                  {ch.free && (
                    <span className="rounded-full bg-[color-mix(in_srgb,#4ade80_22%,transparent)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#4ade80]">{ru ? "бесплатно" : "free"}</span>
                  )}
                </div>
                <h2 className="text-[26px] font-bold leading-[1.12] tracking-[-0.01em] text-[var(--color-text-primary)] sm:text-[32px]">{ch.heading}</h2>
                <p className="mt-2 text-callout leading-relaxed text-[var(--color-text-secondary)]">{ch.dek}</p>
                {!ch.unlocked && (
                  <div className="mt-5 flex flex-col items-start gap-3">
                    <p className="text-footnote text-[var(--color-text-tertiary)]">
                      {ru
                        ? `Внутри: ${ch.conclusion.length} выводов · ${ch.apps.length} приложений · ${ch.ideas.length} идей`
                        : `Inside: ${ch.conclusion.length} conclusions · ${ch.apps.length} apps · ${ch.ideas.length} ideas`}
                    </p>
                    <EnergyUnlockButton type="chapter" slug={ch.slug} cost={UNLOCK_COST.chapter} loggedIn={loggedIn} balance={balance} locale={locale} label={ru ? "Открыть главу" : "Unlock chapter"} />
                  </div>
                )}
              </div>
            </div>
          </div>

          {ch.unlocked && (
            <div className="mt-6 flex flex-col gap-9">
              {ch.conclusion.length > 0 && (
                <div>
                  <h3 className="mx-auto mb-3 max-w-[640px] text-callout font-bold uppercase tracking-wide text-[var(--color-text-tertiary)]">{ru ? "Что выяснили" : "What we found"}</h3>
                  <CardCarousel slides={ch.conclusion} locale={ru ? "ru" : "en"} layout="feed" />
                </div>
              )}
              {ch.apps.length > 0 && (
                <div className="mx-auto w-full max-w-[640px]">
                  <h3 className="mb-3 text-callout font-bold uppercase tracking-wide text-[var(--color-text-tertiary)]">{ru ? "Где это видно" : "Where you see it"}</h3>
                  <div className="flex flex-col gap-3">
                    {ch.apps.map((app, k) => (
                      <AppCard key={k} app={app} id={`ch${ch.i}-app${k}`} ru={ru} locale={locale} />
                    ))}
                  </div>
                </div>
              )}
              {ch.ideas.length > 0 && (
                <div className="mx-auto w-full max-w-[640px]">
                  <h3 className="mb-3 text-callout font-bold uppercase tracking-wide text-[var(--color-text-tertiary)]">{ru ? "Что построить" : "What to build"}</h3>
                  <div className="flex flex-col gap-3">
                    {ch.ideas.map((idea, k) => (
                      <IdeaArticle key={k} idea={idea} n={ideaViews.findIndex((v) => v.slug === idea.slug) + 1} ru={ru} locale={locale} loggedIn={loggedIn} balance={balance} unlocked />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      ))}

      {/* Buy-all — the whole category (every chapter) at a bundle price */}
      {catLocked && (
        <div className="mx-auto mt-12 max-w-[640px]">
          <UnlockGate
            type="category"
            slug={slug}
            cost={catCost}
            loggedIn={loggedIn}
            balance={balance}
            locale={locale}
            title={ru ? "Открыть всю категорию: все главы, приложения и идеи" : "Unlock the whole category: every chapter, app and idea"}
          />
        </div>
      )}
    </main>
  );
}
