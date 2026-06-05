import { notFound } from "next/navigation";
import Link from "next/link";
import { Header } from "@saverin/ui-web";
import { getResearchCategory } from "@/lib/researchCategories";
import { getSegmentBySlug } from "@/lib/segments";
import { getSegmentInsights } from "@/lib/segmentInsights";
import { getSlugByProductId } from "@/lib/appSlugs";
import { prisma } from "@/lib/prisma";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n.server";
import SegmentInsightGap from "@/components/SegmentInsightGap";

export const dynamic = "force-dynamic";

// Category page: apps grid (icon + name from the curated meta) + cross-app
// insight view if available. Sleep-meditation is the only category with the
// insights pipeline currently completed.

export default async function SegmentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = await getLocale();
  const tr = t(locale);

  const cat = getResearchCategory(slug, locale);
  if (!cat) notFound();

  // Insight gap (cross-app top problems) — only renders if the category has
  // a meta-themes mapping + the underlying insights.json data.
  let insightView = null;
  const legacy = getSegmentBySlug(slug, locale);
  if (legacy) {
    const products = await prisma.product.findMany({
      where: { id: { in: legacy.appIds } },
      select: { id: true, name: true, icon: true },
    });
    const nameById = new Map(products.map((p) => [p.id, p.name]));
    const iconById = new Map(products.map((p) => [p.id, p.icon]));
    insightView = getSegmentInsights(slug, legacy.appIds, nameById, iconById, locale);
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
        description={<span className="mx-auto block max-w-2xl">{cat.kicker}</span>}
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

      {insightView && <SegmentInsightGap view={insightView} locale={locale} />}
    </main>
  );
}
