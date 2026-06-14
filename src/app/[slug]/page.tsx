import { notFound } from "next/navigation";
import { getProductDetail } from "@/lib/queries";
import { getProductInsights } from "@/lib/insights";
import { getProductIdBySlug } from "@/lib/appSlugs";
import { isPublishable } from "@/lib/readyApps";
import { getAppMetaByProductId, listDomains } from "@/lib/researchCategories";
import { isPremium, isFreeCategory } from "@/lib/premium";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n.server";
import Link from "next/link";
import BackLink from "@/components/BackLink";
import InsightLanding, { type LandingProduct } from "@/components/InsightLanding";

export const dynamic = "force-dynamic";

// Canonical app insights page, rendered as a typographic long-read. The body
// (hero, lede, histogram, screenshots, theme sections) lives in InsightLanding,
// shared with the model-comparison experiment page. Slug→productId map lives in
// src/data/app-slugs.json; unknown slugs 404.

export default async function AppInsightsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const id = getProductIdBySlug(slug);
  if (!id) notFound();

  // Only publishable разборы render: polarity-balanced ones and hand-authored
  // gems. Legacy negative-only разборы 404 until re-extracted.
  if (!isPublishable(id)) notFound();

  const locale = await getLocale();
  const tr = t(locale);
  const [detail, insights] = await Promise.all([
    getProductDetail(id, locale).catch(() => null),
    Promise.resolve(getProductInsights(id)),
  ]);

  // Scraped apps (ext-*) have insights but no DB Product row; dress the hero
  // from the curated catalog so the long-read still renders.
  let data: LandingProduct | null = detail;
  if (!data && insights) {
    const m = getAppMetaByProductId(id);
    if (m) {
      data = {
        name: m.name,
        developer: m.developer,
        stores: ["apple"],
        icon: m.icon || null,
        screenshots: m.screenshots,
        avgRating: null,
        installs: null,
        ratingCount: null,
      };
    }
  }
  if (!data) notFound();

  // Find a category this app belongs to (for the breadcrumb) and whether any of
  // its categories is free — that decides premium gating below.
  let cat: { slug: string; name: string } | null = null;
  let freeApp = false;
  for (const d of listDomains(locale)) {
    for (const c of d.categories) {
      if (!c.apps.some((a) => a.productId === id)) continue;
      if (!cat) cat = { slug: c.slug, name: c.name };
      if (isFreeCategory(c.slug)) freeApp = true;
    }
  }
  // Premium gate: the full разбор is open only for free-category apps or premium
  // viewers. Otherwise the hero/histogram stay as a teaser and a paywall replaces
  // the insight body.
  const premium = await isPremium();
  const locked = !freeApp && !premium;

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12 sm:py-16">
      <nav className="mb-4 flex flex-wrap items-center gap-1.5 text-footnote text-[var(--color-text-tertiary)]">
        <Link href="/" className="transition-colors hover:text-[var(--color-text-primary)]">
          {locale === "en" ? "Catalog" : "Каталог"}
        </Link>
        {cat && (
          <>
            <span aria-hidden>/</span>
            <Link href={`/segment/${cat.slug}`} className="transition-colors hover:text-[var(--color-text-primary)]">
              {cat.name}
            </Link>
          </>
        )}
        <span aria-hidden>/</span>
        <span className="text-[var(--color-text-secondary)]">{data.name}</span>
      </nav>

      <div className="mb-10">
        <BackLink
          fallback={cat ? `/segment/${cat.slug}` : "/"}
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] px-3.5 py-1.5 text-footnote font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M10 3.5 5.5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {locale === "en" ? "Back" : "Назад"}
        </BackLink>
      </div>

      {insights ? (
        <InsightLanding data={data} insights={insights} tr={tr} locked={locked} />
      ) : (
        <p className="mt-16 text-[14px] text-[var(--color-text-secondary)]">
          Качественный разбор для этого приложения ещё не запущен.
        </p>
      )}
    </main>
  );
}
