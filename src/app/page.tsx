import Link from "next/link";
import { Header } from "@saverin/ui-web";
import IdeaFeed from "@/components/IdeaFeed";
import { getIdeaCards } from "@/lib/queries";
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
  searchParams: Promise<{ cat?: string; type?: string }>;
}) {
  const locale = await getLocale();
  const tr = t(locale);
  const { cat, type } = await searchParams;

  const all = await getIdeaCards(500, null, true, locale);
  const present = new Set(
    all.map((c) => c.category).filter((c): c is string => c != null)
  );
  const tabs = CATEGORIES.filter((c) => present.has(c.key));

  const presentTypes = new Set(
    all
      .map((c) => c.summary?.opportunityType)
      .filter((ty): ty is OpportunityType => ty != null)
  );
  const typeTabs = TYPE_ORDER.filter((ty) => presentTypes.has(ty));

  const activeCat = cat && present.has(cat) ? cat : null;
  const activeType =
    type && presentTypes.has(type as OpportunityType) ? (type as OpportunityType) : null;

  let filtered = all;
  if (activeCat) filtered = filtered.filter((c) => c.category === activeCat);
  if (activeType) filtered = filtered.filter((c) => c.summary?.opportunityType === activeType);

  // The feed renders each card server-side. Cap the count so a single
  // force-dynamic request doesn't serialize the whole deck on the small prod box;
  // the strongest cards lead, so the top slice is the good stuff.
  const cards = filtered.slice(0, 60);

  return (
    <main className="mx-auto max-w-5xl overflow-x-clip px-4 py-10">
      <Header
        size="L"
        as="h1"
        className="mb-6 items-center text-center"
        title={tr.ideas.title}
        description={<span className="mx-auto block max-w-xl">{tr.ideas.desc}</span>}
      />


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
        <IdeaFeed cards={cards} locale={locale} />
      )}
    </main>
  );
}
