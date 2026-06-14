import { notFound } from "next/navigation";
import Link from "next/link";
import { Header } from "@saverin/ui-web";
import { getResearchCategory } from "@/lib/researchCategories";
import { getSlugByProductId } from "@/lib/appSlugs";
import { hasInsight } from "@/lib/readyApps";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n.server";
import SegmentSummaryView from "@/components/SegmentSummary";
import SegmentAppList from "@/components/SegmentAppList";
import { getSegmentSummary } from "@/lib/segmentSummary";
import SegmentTabs from "@/components/SegmentTabs";
import CategoryIdeas from "@/components/CategoryIdeas";
import { listIdeas } from "@/lib/ideas";
import { isPremium, canAccessCategory } from "@/lib/premium";
import Paywall from "@/components/Paywall";

export const dynamic = "force-dynamic";

// Category page: apps grid (icon + name from the curated meta) + the
// cross-app category synthesis ("инсайты категории").

type CatApp = { query: string; name: string; icon: string; productId: string | null };

// Prepositional-case plural: «в 1 приложении», «в 11 приложениях».
function appsPrep(n: number): string {
  return n % 10 === 1 && n % 100 !== 11 ? "приложении" : "приложениях";
}

function AppTile({ a }: { a: CatApp }) {
  const linkSlug = a.productId ? getSlugByProductId(a.productId) : null;
  // Colour only apps that have a shipped разбор; the rest stay greyscale.
  const ready = hasInsight(a.productId);
  const tileClass =
    "flex items-center gap-3 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] px-3 py-2.5";
  const inner = (
    <>
      {a.icon ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={a.icon}
          alt=""
          className={`size-9 shrink-0 rounded-[12px] object-cover ${ready ? "" : "opacity-40 grayscale"}`}
        />
      ) : (
        <div className="size-9 shrink-0 rounded-[12px] bg-[var(--color-bg-muted)]" />
      )}
      <span
        className={`min-w-0 flex-1 truncate text-callout font-medium ${
          ready ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-tertiary)]"
        }`}
      >
        {a.name}
      </span>
      {ready && linkSlug && (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0 text-[var(--color-text-tertiary)]">
          <path d="m6 4 4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </>
  );
  return ready && linkSlug ? (
    <Link href={`/${linkSlug}`} className={`${tileClass} transition-colors hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-card-subtle)]`}>
      {inner}
    </Link>
  ) : (
    <div className={tileClass}>{inner}</div>
  );
}

export default async function SegmentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = await getLocale();
  const tr = t(locale);

  const cat = getResearchCategory(slug, locale);
  if (!cat) notFound();

  const readyCount = cat.apps.filter((a) => hasInsight(a.productId)).length;
  const summary = getSegmentSummary(slug);
  const ideas = listIdeas().filter((i) => i.category === slug);
  const premium = await isPremium();
  const locked = !canAccessCategory(slug, premium);

  return (
    <main className="mx-auto w-full max-w-[720px] overflow-x-clip px-4 py-6">
      <div className="mb-5">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] px-3.5 py-1.5 text-footnote font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M10 3.5 5.5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {tr.market2.backToIndex}
        </Link>
      </div>
      <Header
        size="L"
        as="h1"
        className="mb-5 items-center text-center"
        title={cat.name}
      />

      <section className="mb-6 flex flex-col gap-3">
        <h2 className="text-callout text-[var(--color-text-secondary)]">
          {locale === "en" ? (
            <>
              Analyzed every review across{" "}
              <span className="font-semibold tabular-nums text-[var(--color-text-primary)]">{readyCount}</span> apps
            </>
          ) : (
            <>
              Разобрали все отзывы в{" "}
              <span className="font-semibold tabular-nums text-[var(--color-text-primary)]">{readyCount}</span>{" "}
              {appsPrep(readyCount)}
            </>
          )}
        </h2>
        <SegmentAppList
          total={cat.apps.length}
          locale={locale}
          tiles={cat.apps.map((a) => (
            <AppTile key={a.query} a={a} />
          ))}
        />
      </section>

      {locked ? (
        <Paywall />
      ) : (
        (summary || ideas.length > 0) && (
          <div className="mt-10 border-t border-[var(--color-border-strong)] pt-8">
            <SegmentTabs
              summary={summary ? <SegmentSummaryView summary={summary} embedded /> : null}
              ideas={ideas.length > 0 ? <CategoryIdeas ideas={ideas} /> : null}
              ideasCount={ideas.length}
            />
          </div>
        )
      )}
    </main>
  );
}
