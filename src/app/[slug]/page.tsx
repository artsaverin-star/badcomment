import { notFound } from "next/navigation";
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
    openGraph: { title, description, type: "article", url, siteName: "inApp", locale: ru ? "ru_RU" : "en_US", images: [`https://inapp.pro/api/og?l=${ru ? "ru" : "en"}`] },
    twitter: { card: "summary_large_image", title, description, images: [`https://inapp.pro/api/og?l=${ru ? "ru" : "en"}`] },
    robots: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  };
}

function QuoteList({ quotes }: { quotes: string[] }) {
  if (!quotes.length) return null;
  return (
    <div className="mt-3 flex flex-col gap-2">
      {quotes.map((q, i) => (
        <p key={i} className="rounded-[12px] bg-[var(--color-surface-card)] px-3.5 py-2.5 text-[14px] leading-[1.5] text-[var(--color-text-secondary)]">{q}</p>
      ))}
    </div>
  );
}

function CardCol({ items, tone }: { items: AppCtx["loves"]; tone: "love" | "pain" }) {
  return (
    <div className="flex flex-col gap-4">
      {items.map((c, i) => (
        <div key={i} className="rounded-[18px] border border-[var(--color-border-subtle)] p-5">
          <div className="flex items-start gap-2.5">
            <span className={`mt-1 inline-block size-2 shrink-0 rounded-full ${tone === "love" ? "bg-emerald-500" : "bg-rose-500"}`} />
            <h3 className="text-[17px] font-semibold leading-[1.25] tracking-[-0.01em] text-[var(--color-text-primary)]">{tg(c.title)}</h3>
          </div>
          {c.body && <p className="mt-2 text-[14px] leading-[1.5] text-[var(--color-text-tertiary)]">{tg(c.body)}</p>}
          <QuoteList quotes={c.quotes} />
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

  return (
    <main className="mx-auto w-full max-w-3xl px-2 sm:px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav className="text-[13px] text-[var(--color-text-tertiary)]">
        <Link href={`/segment/${ctx.catSlug}`} className="hover:text-[var(--color-text-secondary)]">{ctx.catName}</Link>
        <span className="mx-1.5">/</span>
        <span>{ctx.name}</span>
      </nav>

      <header className="mt-5 flex items-start gap-4">
        {ctx.icon && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ctx.icon} alt="" className="size-16 rounded-[18px] object-cover ring-1 ring-[var(--color-border-subtle)]" />
        )}
        <div className="min-w-0">
          <h1 className="text-[30px] font-bold leading-[1.05] tracking-[-0.02em] text-[var(--color-text-primary)] sm:text-[36px]">
            {ru ? `${ctx.name} — отзывы` : `${ctx.name} reviews`}
          </h1>
          <p className="mt-1.5 text-[14px] text-[var(--color-text-tertiary)]">
            {ru ? `Что хвалят и на что злятся · разбор ${ctx.reviews.toLocaleString("ru-RU")} отзывов` : `What users love and hate · ${ctx.reviews.toLocaleString("en-US")} reviews analyzed`}
            {ctx.rating ? ` · ★ ${ctx.rating.avg}` : ""}
          </p>
        </div>
      </header>

      {ctx.desc && <p className="mt-5 text-[17px] font-light leading-[1.5] text-[var(--color-text-secondary)]">{tg(ctx.desc)}</p>}

      {ctx.loves.length > 0 && (
        <section className="mt-10">
          <h2 className="text-[20px] font-semibold tracking-[-0.01em] text-[var(--color-text-primary)]">{ru ? "Что хвалят" : "What users love"}</h2>
          <div className="mt-4"><CardCol items={ctx.loves} tone="love" /></div>
        </section>
      )}

      {ctx.pains.length > 0 && (
        <section className="mt-10">
          <h2 className="text-[20px] font-semibold tracking-[-0.01em] text-[var(--color-text-primary)]">{ru ? "На что злятся" : "What users hate"}</h2>
          <div className="mt-4"><CardCol items={ctx.pains} tone="pain" /></div>
        </section>
      )}

      {/* Funnel into the niche — the whole point of this landing page. */}
      <Link
        href={`/segment/${ctx.catSlug}`}
        className="mt-12 flex flex-col gap-1 rounded-[20px] border border-[var(--color-border-strong)] bg-[var(--color-surface-card)] p-6 transition-colors hover:border-[var(--color-text-brand)]"
      >
        <span className="text-[13px] font-medium tracking-[0.06em] text-[var(--color-text-brand)]">{ru ? "Вся ниша" : "The whole niche"}</span>
        <span className="text-[21px] font-semibold leading-[1.15] tracking-[-0.02em] text-[var(--color-text-primary)] sm:text-[24px]">
          {ru ? `${ctx.catName}: что построить и где дыры конкурентов` : `${ctx.catName}: what to build and where rivals fall short`}
        </span>
        <span className="mt-1 inline-flex items-center gap-1.5 text-[15px] font-medium text-[var(--color-text-secondary)]">
          {ru ? "Смотреть разбор ниши" : "See the niche breakdown"}
          <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true" className="text-[var(--color-text-brand)]"><path d="M6 4l5 5-5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </span>
      </Link>
    </main>
  );
}
