import { notFound } from "next/navigation";
import Link from "next/link";
import { Header } from "@saverin/ui-web";
import { getNeedsGap } from "@/lib/needsGap";
import { getSegmentCards, getSegmentApps } from "@/lib/segmentCards";
import { getSegmentBySlug } from "@/lib/segments";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n.server";
import NeedsGap from "@/components/NeedsGap";
import SegmentCards from "@/components/SegmentCards";
import SegmentApps from "@/components/SegmentApps";

export const dynamic = "force-dynamic";

// Landing with no ?seg = a directory of every collected segment. ?seg=<slug>
// drills into one: a real needs-gap view if the genre has a taxonomy in
// src/lib/taxonomy.ts (language-learning, translators), otherwise an honest
// "not classified yet" stub. Unknown slugs 404.
export default async function Market2({
  searchParams,
}: {
  searchParams: Promise<{ seg?: string }>;
}) {
  const locale = await getLocale();
  const tr = t(locale);
  const { seg } = await searchParams;

  if (!seg) {
    const cards = await getSegmentCards(locale);
    return (
      <main className="mx-auto max-w-4xl overflow-x-clip px-4 py-10">
        <Header
          size="L"
          as="h1"
          className="mb-3 items-center text-center"
          title={tr.market2.title}
          description={<span className="mx-auto block max-w-2xl">{tr.market2.indexSubtitle}</span>}
        />
        <div className="mt-8">
          <SegmentCards cards={cards} locale={locale} />
        </div>
      </main>
    );
  }

  const segment = getSegmentBySlug(seg, locale);
  if (!segment) notFound();

  const [view, apps] = await Promise.all([getNeedsGap(seg, locale), getSegmentApps(seg, locale)]);

  return (
    <main className="mx-auto max-w-4xl overflow-x-clip px-4 py-10">
      <div className="mb-6">
        <Link
          href="/market2"
          className="text-[13px] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
        >
          ← {tr.market2.backToIndex}
        </Link>
      </div>
      <Header
        size="L"
        as="h1"
        className="mb-8 items-center text-center"
        title={segment.name}
        description={<span className="mx-auto block max-w-2xl">{tr.market2.subtitle}</span>}
      />

      {apps.length > 0 && <SegmentApps apps={apps} locale={locale} />}

      {view ? (
        <>
          <p className="mb-8 text-center text-[13px] text-[var(--color-text-tertiary)]">
            {tr.market2.scanned(view.reviewsScanned)}
          </p>
          <NeedsGap view={view} locale={locale} />
        </>
      ) : (
        <div className="mt-8 rounded-[var(--radius-xl)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-8 text-center">
          <Header size="S" as="h2" className="items-center" title={tr.market2.stubHeading} />
          <p className="mx-auto mt-2 max-w-md text-[14px] text-[var(--color-text-secondary)]">
            {tr.market2.stubNote}
          </p>
        </div>
      )}
    </main>
  );
}
