import { notFound } from "next/navigation";
import Link from "next/link";
import { Header } from "@saverin/ui-web";
import { getResearchCategory } from "@/lib/researchCategories";
import { getSlugByProductId } from "@/lib/appSlugs";
import { hasInsight } from "@/lib/readyApps";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n.server";
import SegmentSummaryView from "@/components/SegmentSummary";
import { getSegmentSummary } from "@/lib/segmentSummary";

export const dynamic = "force-dynamic";

// Category page: apps grid (icon + name from the curated meta) + the
// cross-app category synthesis ("инсайты категории").

export default async function SegmentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = await getLocale();
  const tr = t(locale);

  const cat = getResearchCategory(slug, locale);
  if (!cat) notFound();

  const summary = getSegmentSummary(slug);

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
            // Colour only apps that have a shipped разбор; the rest stay greyscale.
            const ready = hasInsight(a.productId);
            const tileClass =
              "flex items-center gap-2 rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] py-1 pl-1 pr-2.5";
            const inner = (
              <>
                {a.icon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={a.icon}
                    alt=""
                    className={`size-6 shrink-0 rounded-full object-cover ${ready ? "" : "opacity-40 grayscale"}`}
                  />
                ) : (
                  <div className="size-6 shrink-0 rounded-full bg-[var(--color-bg-muted)]" />
                )}
                <span
                  className={`truncate text-[12px] ${
                    ready ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-tertiary)]"
                  }`}
                >
                  {a.name}
                </span>
              </>
            );
            return ready && linkSlug ? (
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

      {summary && <SegmentSummaryView summary={summary} />}
    </main>
  );
}
