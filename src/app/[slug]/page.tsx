import { notFound } from "next/navigation";
import { ogImage } from "@/lib/og";
import Link from "next/link";
import type { Metadata } from "next";
import { getLocale } from "@/lib/i18n.server";
import { getProductIdBySlug } from "@/lib/appSlugs";
import { appCardsFor, descriptionFor } from "@/lib/regenCards";
import { getProductInsights } from "@/lib/insights";
import { hasInsight } from "@/lib/readyApps";
import { getCategoryBySlug } from "@/lib/researchCategories";
import { tg } from "@/lib/typo";
import active from "@/data/active-categories.json";
import type { Locale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

// SEO landing page for a single app's review teardown. Indexed (200,
// self-canonical, unique content), NOT surfaced in the main interface, and
// funnels the search visitor INTO the category page via a prominent CTA. The
// crawl path comes from the footer-linked /apps directory + the sitemap.

type AppCtx = {
  pid: string;
  name: string;
  icon: string | null;
  catSlug: string;
  catName: string;
  desc?: string;
  loves: Array<{ title: string; body: string | null; quotes: string[] }>;
  pains: Array<{ title: string; body: string | null; quotes: string[] }>;
  reviews: number;
  rating: { avg: number; count: number } | null;
};

function resolve(slug: string, locale: Locale): AppCtx | null {
  const pid = getProductIdBySlug(slug);
  if (!pid || !hasInsight(pid)) return null;
  for (const cs of active as string[]) {
    const cat = getCategoryBySlug(cs, locale);
    const app = cat?.apps.find((a) => a.productId === pid);
    if (!cat || !app) continue;
    const ins = getProductInsights(pid);
    const cards = appCardsFor(pid, locale)?.product ?? [];
    const mapCard = (c: { title: string; plus?: string | null; minus?: string | null; evidence?: Array<{ quote: string }> }) => ({
      title: c.title,
      body: (c.plus ?? c.minus) || null,
      quotes: (c.evidence ?? []).map((e) => e.quote).filter(Boolean).slice(0, 3),
    });
    const loves = cards.filter((c) => c.plus?.trim()).map(mapCard);
    const pains = cards.filter((c) => c.minus?.trim() && !c.plus?.trim()).map(mapCard);
    const rb = ins?.ratingBreakdown;
    let rating: { avg: number; count: number } | null = null;
    if (rb) {
      const count = Object.values(rb).reduce((s, n) => s + (n || 0), 0);
      const sum = Object.entries(rb).reduce((s, [k, n]) => s + Number(k) * (n || 0), 0);
      if (count > 0) rating = { avg: Math.round((sum / count) * 10) / 10, count };
    }
    return {
      pid, name: app.name, icon: app.icon ?? null, catSlug: cs, catName: cat.name,
      desc: descriptionFor(pid, locale, ins?.description),
      loves, pains, reviews: ins?.reviewsScanned ?? 500, rating,
    };
  }
  return null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getLocale();
  const ru = locale !== "en";
  const ctx = resolve(slug, locale);
  if (!ctx) return { robots: { index: false, follow: false } };
  const title = ru
    ? `${ctx.name} — отзывы: что хвалят и на что злятся`
    : `${ctx.name} reviews — what users love and hate`;
  const description = ru
    ? `Разбор ${ctx.reviews.toLocaleString("ru-RU")} отзывов на ${ctx.name}: сильные стороны, болевые точки и цитаты пользователей. Часть исследования ниши «${ctx.catName}».`
    : `A breakdown of ${ctx.reviews.toLocaleString("en-US")} ${ctx.name} reviews: strengths, pain points and real user quotes. Part of the "${ctx.catName}" niche research.`;
  const lp = ru ? "ru" : "en";
  const url = `https://inapp.pro/${lp}/${slug}`;
  return {
    title,
    description,
    keywords: ru
      ? [`${ctx.name} отзывы`, `${ctx.name} проблемы`, `что не так с ${ctx.name}`, ctx.catName, "разбор отзывов"]
      : [`${ctx.name} reviews`, `${ctx.name} problems`, `${ctx.name} complaints`, ctx.catName, "review analysis"],
    alternates: {
      canonical: url,
      languages: { ru: `https://inapp.pro/ru/${slug}`, en: `https://inapp.pro/en/${slug}`, "x-default": `https://inapp.pro/en/${slug}` },
    },
    openGraph: { title, description, type: "article", url, siteName: "inApp", locale: ru ? "ru_RU" : "en_US", images: [ogImage(ru)] },
    twitter: { card: "summary_large_image", title, description, images: [ogImage(ru)] },
    robots: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  };
}

// Quote bubbles, same chat-style as the niche dossier evidence.
function QuoteList({ quotes }: { quotes: string[] }) {
  if (!quotes.length) return null;
  return (
    <div className="mt-4 flex flex-col gap-2.5">
      {quotes.map((q, i) => (
        <figure key={i} className="max-w-[92%] self-start rounded-[18px] rounded-bl-[5px] bg-[var(--color-bg-muted)] px-4 py-3">
          <p className="text-callout italic text-[var(--color-text-secondary)]">{tg(q)}</p>
        </figure>
      ))}
    </div>
  );
}

function CardCol({ items, tone }: { items: AppCtx["loves"]; tone: "love" | "pain" }) {
  return (
    <div className="mt-7 flex flex-col gap-3">
      {items.map((c, i) => (
        <div key={i} className="card-min rounded-[22px] p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className={`mt-[7px] inline-block size-2 shrink-0 rounded-full ${tone === "love" ? "bg-[#30d158]" : "bg-[#ff453a]"}`} />
            <h3 className="text-body font-medium text-[var(--color-text-primary)]">{tg(c.title)}</h3>
          </div>
          {c.body && <p className="mt-2 pl-5 text-callout text-[var(--color-text-secondary)]">{tg(c.body)}</p>}
          <div className="pl-5"><QuoteList quotes={c.quotes} /></div>
        </div>
      ))}
    </div>
  );
}

export default async function AppPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = await getLocale();
  const ru = locale !== "en";
  const ctx = resolve(slug, locale);
  if (!ctx) notFound();

  const lp = ru ? "ru" : "en";
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name: ctx.name,
        applicationCategory: "MobileApplication",
        operatingSystem: "Android, iOS",
        ...(ctx.rating ? { aggregateRating: { "@type": "AggregateRating", ratingValue: ctx.rating.avg, ratingCount: ctx.rating.count, bestRating: 5, worstRating: 1 } } : {}),
      },
      {
        "@type": "Article",
        headline: ru ? `${ctx.name} — отзывы: что хвалят и на что злятся` : `${ctx.name} reviews — what users love and hate`,
        about: ctx.name,
        inLanguage: lp,
        isAccessibleForFree: true,
        publisher: { "@id": "https://inapp.pro/#org" },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "inApp", item: `https://inapp.pro/${lp}` },
          { "@type": "ListItem", position: 2, name: ctx.catName, item: `https://inapp.pro/${lp}/segment/${ctx.catSlug}` },
          { "@type": "ListItem", position: 3, name: ctx.name, item: `https://inapp.pro/${lp}/${slug}` },
        ],
      },
    ],
  };

  const nf = (n: number) => n.toLocaleString(ru ? "ru-RU" : "en-US");
  const stats = [
    { n: nf(ctx.reviews), l: ru ? "отзывов разобрано" : "reviews analyzed" },
    ...(ctx.rating ? [{ n: `${ctx.rating.avg}`, l: ru ? "средняя оценка" : "average rating" }] : []),
    { n: `${ctx.loves.length + ctx.pains.length}`, l: ru ? "выводов" : "findings" },
  ];

  return (
    <main className="mx-auto w-full max-w-[720px] px-4 pb-28 pt-16 sm:px-6 sm:pt-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <Link
        href={`/${lp}/segment/${ctx.catSlug}`}
        className="card-min inline-flex items-center gap-1.5 rounded-full py-2 pl-3 pr-4 text-footnote font-medium text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M10 3.25 5.25 8 10 12.75" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        {ctx.catName}
      </Link>

      <header className="mt-12 flex items-start gap-4 sm:gap-5">
        {ctx.icon && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ctx.icon} alt="" className="size-16 shrink-0 rounded-[18px] object-cover ring-1 ring-[var(--color-border-subtle)] sm:size-20" />
        )}
        <div className="min-w-0">
          <h1 className="text-title1 text-balance text-[var(--color-text-primary)]">
            {ru ? `${ctx.name} — отзывы` : `${ctx.name} reviews`}
          </h1>
          <p className="mt-2.5 text-callout text-[var(--color-text-tertiary)]">
            {ru ? "Что хвалят и на что злятся, по реальным отзывам" : "What users love and hate, from real reviews"}
          </p>
        </div>
      </header>

      {ctx.desc && <p className="mt-8 max-w-[60ch] text-lead text-pretty text-[var(--color-text-secondary)]">{tg(ctx.desc)}</p>}

      <div className="mt-10 flex flex-wrap gap-x-12 gap-y-8">
        {stats.map((s, i) => (
          <div key={i} className="flex flex-col">
            <span className="text-stat tabular-nums text-[var(--color-text-primary)]">{s.n}</span>
            <span className="mt-2.5 text-footnote text-[var(--color-text-tertiary)]">{s.l}</span>
          </div>
        ))}
      </div>

      {ctx.loves.length > 0 && (
        <section className="mt-20 sm:mt-24">
          <div className="text-footnote text-[var(--color-text-tertiary)]">{ru ? "Сильные стороны" : "Strengths"}</div>
          <h2 className="mt-4 text-title2 text-[var(--color-text-primary)]">{ru ? "Что хвалят" : "What users love"}</h2>
          <CardCol items={ctx.loves} tone="love" />
        </section>
      )}

      {ctx.pains.length > 0 && (
        <section className="mt-20 sm:mt-24">
          <div className="text-footnote text-[var(--color-text-tertiary)]">{ru ? "Слабые места" : "Weak spots"}</div>
          <h2 className="mt-4 text-title2 text-[var(--color-text-primary)]">{ru ? "На что злятся" : "What users hate"}</h2>
          <CardCol items={ctx.pains} tone="pain" />
        </section>
      )}

      {/* Funnel into the niche — the whole point of this landing page. */}
      <Link
        href={`/${lp}/segment/${ctx.catSlug}`}
        className="mt-20 flex flex-col gap-2 rounded-[24px] bg-[var(--color-text-primary)] p-6 transition-opacity hover:opacity-95 sm:mt-24 sm:p-8"
      >
        <span className="text-caption text-[color-mix(in_srgb,var(--color-bg-page)_65%,transparent)]">{ru ? "Вся ниша" : "The whole niche"}</span>
        <span className="text-title3 text-pretty text-[var(--color-bg-page)]">
          {ru ? `${ctx.catName}: что построить и где дыры конкурентов` : `${ctx.catName}: what to build and where rivals fall short`}
        </span>
        <span className="mt-1 inline-flex items-center gap-1.5 text-callout font-medium text-[color-mix(in_srgb,var(--color-bg-page)_80%,transparent)]">
          {ru ? "Смотреть разбор ниши" : "See the niche breakdown"}
          <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M6 4l5 5-5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </span>
      </Link>
    </main>
  );
}
