import { notFound } from "next/navigation";
import { buttonVariants, cn } from "@saverin/ui-web";
import { getProductDetail } from "@/lib/queries";
import { getProductInsights } from "@/lib/insights";
import { getProductIdBySlug } from "@/lib/appSlugs";
import { isPublishable } from "@/lib/readyApps";
import { getAppMetaByProductId } from "@/lib/researchCategories";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n.server";
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

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12 sm:py-16">
      <BackLink fallback="/" className={cn(buttonVariants({ variant: "ghost", size: "S" }), "mb-10 -ml-2")}>
        {tr.nav.back}
      </BackLink>

      {insights ? (
        <InsightLanding data={data} insights={insights} tr={tr} />
      ) : (
        <p className="mt-16 text-[14px] text-[var(--color-text-secondary)]">
          Качественный разбор для этого приложения ещё не запущен.
        </p>
      )}
    </main>
  );
}
