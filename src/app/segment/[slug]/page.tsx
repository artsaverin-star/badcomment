import { notFound } from "next/navigation";
import Link from "next/link";
import { Header } from "@saverin/ui-web";
import { getResearchCategory } from "@/lib/researchCategories";
import { getSegmentInsightsByTheme } from "@/lib/segmentInsightsByTheme";
import { getSlugByProductId } from "@/lib/appSlugs";
import { prisma } from "@/lib/prisma";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n.server";
import SegmentThemeView, { type ProductMetaMap } from "@/components/SegmentThemeView";
import SegmentSummaryView from "@/components/SegmentSummary";
import { getSegmentSummary } from "@/lib/segmentSummary";

export const dynamic = "force-dynamic";

// Category page: apps grid (icon + name from the curated meta) + cross-app
// theme-bucketed insights (the real per-app insights aggregated by theme).

export default async function SegmentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = await getLocale();
  const tr = t(locale);

  const cat = getResearchCategory(slug, locale);
  if (!cat) notFound();

  // Derive insight scope directly from the curated category's apps. The
  // legacy segments.json mapping is gone — categories.json is the source of
  // truth for which apps live in a sub-category.
  const appIds = cat.apps.map((a) => a.productId).filter((id): id is string => !!id);
  const summary = getSegmentSummary(slug);
  let themeView = null;
  const productMeta: ProductMetaMap = {};
  if (appIds.length > 0) {
    themeView = getSegmentInsightsByTheme(slug, appIds);
    if (themeView) {
      // Seed labels from the curated catalog so insight rows render names/icons
      // even where the DB product row is missing; overlay canonical DB meta.
      for (const a of cat.apps) {
        if (a.productId) productMeta[a.productId] = { name: a.name, icon: a.icon ?? null };
      }
      const products = await prisma.product.findMany({
        where: { id: { in: appIds } },
        select: { id: true, name: true, icon: true },
      });
      for (const p of products) productMeta[p.id] = { name: p.name, icon: p.icon };
    }
  }

  return (
    <main className="mx-auto w-full max-w-[720px] overflow-x-clip px-4 py-6">
      <div className="mb-4">
        <Link
          href="/"
          className="text-[13px] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
        >
          ← {tr.market2.backToIndex}
        </Link>
      </div>
      <Header
        size="L"
        as="h1"
        className="mb-5 items-center text-center"
        title={cat.name}
      />

      <section className="mb-6 flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4">
          {cat.apps.map((a) => {
            const linkSlug = a.productId ? getSlugByProductId(a.productId) : null;
            const tileClass =
              "flex items-center gap-2 rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] py-1 pl-1 pr-2.5";
            const inner = (
              <>
                {a.icon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.icon} alt="" className="size-6 shrink-0 rounded-full object-cover" />
                ) : (
                  <div className="size-6 shrink-0 rounded-full bg-[var(--color-bg-muted)]" />
                )}
                <span className="truncate text-[12px] text-[var(--color-text-primary)]">{a.name}</span>
              </>
            );
            return linkSlug ? (
              <Link
                key={a.query}
                href={`/${linkSlug}`}
                className={`${tileClass} transition-colors hover:border-[var(--color-text-tertiary)]`}
              >
                {inner}
              </Link>
            ) : (
              <div key={a.query} className={tileClass}>
                {inner}
              </div>
            );
          })}
        </div>
      </section>

      {themeView && <SegmentThemeView view={themeView} productMeta={productMeta} />}

      {summary && <SegmentSummaryView summary={summary} />}
    </main>
  );
}
