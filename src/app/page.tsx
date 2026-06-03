import Link from "next/link";
import { Header } from "@saverin/ui-web";
import IdeaFeed from "@/components/IdeaFeed";
import { getFullDeck, filterDeck, PAGE_SIZE } from "@/lib/deck";
import { getDataFreshness } from "@/lib/queries";
import { getSegmentBySlug } from "@/lib/segments";
import { formatCount } from "@/lib/format";
import { t, categoryLabelL, opportunityTypeLabelL } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n.server";
import { CATEGORIES } from "@/lib/categories";
import type { OpportunityType } from "@/lib/summarize";

export const dynamic = "force-dynamic";

const TYPE_ORDER: OpportunityType[] = [
  "design",
  "features",
  "reliability",
  "pricing",
  "content",
  "support",
];

function tabClass(active: boolean) {
  return `rounded-full px-3 py-1 text-[13px] font-medium transition-colors [font-family:var(--brand-font-family)] ${
    active
      ? "bg-[var(--color-accent-brand)] text-[var(--color-button-primary-text)]"
      : "bg-[var(--color-bg-muted)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
  }`;
}

function deckHref(params: { cat?: string | null; type?: string | null }) {
  const sp = new URLSearchParams();
  if (params.cat) sp.set("cat", params.cat);
  if (params.type) sp.set("type", params.type);
  const q = sp.toString();
  return q ? `/?${q}` : "/";
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string; type?: string; seg?: string }>;
}) {
  const locale = await getLocale();
  const tr = t(locale);
  const { cat, type, seg } = await searchParams;

  const segment = seg ? getSegmentBySlug(seg, locale) : null;
  const memberIds = segment ? new Set(segment.appIds) : null;

  const deck = await getFullDeck(locale);
  const fresh = await getDataFreshness();
  const freshDate = fresh.latest
    ? new Intl.DateTimeFormat(locale, { month: "short", year: "numeric" }).format(fresh.latest)
    : null;
  const present = new Set(
    deck.map((c) => c.category).filter((c): c is string => c != null)
  );
  const tabs = CATEGORIES.filter((c) => present.has(c.key));

  const presentTypes = new Set(
    deck
      .map((c) => c.summary?.opportunityType)
      .filter((ty): ty is OpportunityType => ty != null)
  );
  const typeTabs = TYPE_ORDER.filter((ty) => presentTypes.has(ty));

  const activeCat = cat && present.has(cat) ? cat : null;
  const activeType =
    type && presentTypes.has(type as OpportunityType) ? (type as OpportunityType) : null;

  const filtered = filterDeck(deck, activeCat, activeType, memberIds);

  // Render only the first page server-side; the feed lazy-loads the rest as the
  // user scrolls (see IdeaFeed), so there's no cap — the whole deck is reachable
  // without serializing it all on one request.
  const cards = filtered.slice(0, PAGE_SIZE);
  const nextOffset = filtered.length > PAGE_SIZE ? PAGE_SIZE : null;

  return (
    <main className="mx-auto max-w-5xl overflow-x-clip px-4 py-10">
      <Header
        size="L"
        as="h1"
        className="mb-6 items-center text-center"
        title={segment ? segment.name : tr.ideas.title}
        description={
          segment ? (
            <Link href="/market" className="mx-auto block text-[var(--color-text-brand)]">
              {tr.market.backToMarket}
            </Link>
          ) : (
            <span className="mx-auto block max-w-xl">{tr.ideas.desc}</span>
          )
        }
      />

      {!segment && freshDate && (
        <p className="mb-6 text-center text-[13px] text-[var(--color-text-tertiary)]">
          {tr.marketDash.dataFresh(freshDate, formatCount(fresh.reviews))}
        </p>
      )}

      <nav className="mb-3 flex flex-wrap justify-center gap-2">
        <Link href={deckHref({ type: activeType })} className={tabClass(!activeCat)}>
          {tr.ideas.all}
        </Link>
        {tabs.map((c) => (
          <Link
            key={c.key}
            href={deckHref({ cat: c.key, type: activeType })}
            className={tabClass(activeCat === c.key)}
          >
            {categoryLabelL(locale, c.key)}
          </Link>
        ))}
      </nav>

      {typeTabs.length > 0 && (
        <nav className="mb-8 flex flex-wrap justify-center gap-2">
          <Link href={deckHref({ cat: activeCat })} className={tabClass(!activeType)}>
            {tr.ideas.all}
          </Link>
          {typeTabs.map((ty) => (
            <Link
              key={ty}
              href={deckHref({ cat: activeCat, type: ty })}
              className={tabClass(activeType === ty)}
            >
              {opportunityTypeLabelL(locale, ty)}
            </Link>
          ))}
        </nav>
      )}

      {cards.length === 0 ? (
        <p className="text-center text-[15px] text-[var(--color-text-tertiary)]">{tr.ideas.empty}</p>
      ) : (
        <IdeaFeed
          key={`${activeCat ?? "all"}-${activeType ?? "all"}-${segment?.slug ?? "all"}`}
          cards={cards}
          locale={locale}
          cat={activeCat}
          type={activeType}
          seg={segment?.slug ?? null}
          initialNextOffset={nextOffset}
        />
      )}
    </main>
  );
}
