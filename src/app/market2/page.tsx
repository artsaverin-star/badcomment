import { notFound } from "next/navigation";
import { Header } from "@saverin/ui-web";
import { getNeedsGap } from "@/lib/needsGap";
import { getSegmentBySlug } from "@/lib/segments";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n.server";
import NeedsGap from "@/components/NeedsGap";

export const dynamic = "force-dynamic";

// The needs-gap view runs on any genre that has a taxonomy in src/lib/taxonomy.ts
// with classified reviews (currently language-learning and translators). Reachable
// via ?seg=<slug>; defaults to language-learning.
const PILOT_SLUG = "language-learning";

export default async function Market2({
  searchParams,
}: {
  searchParams: Promise<{ seg?: string }>;
}) {
  const locale = await getLocale();
  const tr = t(locale);
  const { seg } = await searchParams;
  const slug = seg ?? PILOT_SLUG;

  const view = await getNeedsGap(slug, locale);
  if (!view) notFound();

  const segment = getSegmentBySlug(slug, locale);

  return (
    <main className="mx-auto max-w-4xl overflow-x-clip px-4 py-10">
      <Header
        size="L"
        as="h1"
        className="mb-3 items-center text-center"
        title={tr.market2.title}
        description={<span className="mx-auto block max-w-2xl">{tr.market2.subtitle}</span>}
      />
      <p className="mb-8 text-center text-[13px] text-[var(--color-text-tertiary)]">
        {tr.market2.pilotNote(segment?.name ?? slug)} · {tr.market2.scanned(view.reviewsScanned)}
      </p>

      <NeedsGap view={view} locale={locale} />
    </main>
  );
}
