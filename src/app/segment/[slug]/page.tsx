import { notFound } from "next/navigation";
import Link from "next/link";
import { Header } from "@saverin/ui-web";
import { getSegmentApps } from "@/lib/segmentCards";
import { getSegmentBySlug } from "@/lib/segments";
import { getSegmentInsights } from "@/lib/segmentInsights";
import { prisma } from "@/lib/prisma";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n.server";
import SegmentApps from "@/components/SegmentApps";
import SegmentInsightGap from "@/components/SegmentInsightGap";

export const dynamic = "force-dynamic";

// One segment ("Sleep & meditation" etc.) — apps grid + cross-app top-problems
// view derived from the qualitative insights. Replaces the legacy /?seg= path
// with a proper /segment/<slug> URL.

export default async function SegmentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = await getLocale();
  const tr = t(locale);

  const segment = getSegmentBySlug(slug, locale);
  if (!segment) notFound();

  const products = await prisma.product.findMany({
    where: { id: { in: segment.appIds } },
    select: { id: true, name: true, icon: true },
  });
  const nameById = new Map(products.map((p) => [p.id, p.name]));
  const iconById = new Map(products.map((p) => [p.id, p.icon]));
  const insightView = getSegmentInsights(slug, segment.appIds, nameById, iconById, locale);

  const apps = await getSegmentApps(slug, locale);

  return (
    <main className="mx-auto w-full max-w-[640px] overflow-x-clip px-4 py-6">
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
        title={segment.name}
        description={
          insightView ? (
            <span className="mx-auto block max-w-2xl">{tr.market2.subtitle}</span>
          ) : null
        }
      />

      {apps.length > 0 && <SegmentApps apps={apps} locale={locale} />}

      {insightView && <SegmentInsightGap view={insightView} locale={locale} />}
    </main>
  );
}
