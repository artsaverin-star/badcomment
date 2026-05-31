import Link from "next/link";
import IdeaDeck from "@/components/IdeaDeck";
import IdeaCardExploded from "@/components/IdeaCardExploded";
import { getIdeaCards } from "@/lib/queries";
import { getLocale, t, categoryLabelL, opportunityTypeLabelL } from "@/lib/i18n";
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
  return `rounded-full px-3 py-1 text-sm transition-colors ${
    active
      ? "bg-red-600 text-white"
      : "bg-black/5 text-neutral-600 hover:bg-black/10 dark:bg-white/10 dark:text-neutral-300 dark:hover:bg-white/20"
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

  // Render each card to its exploded layout on the server, then hand the slides
  // to the client swiper (keeps all i18n server-side; client only flips index).
  // Cap the rendered slides so a single force-dynamic request doesn't serialize
  // the whole deck; the strongest cards lead, so the top slice is the good stuff.
  const slides = filtered
    .slice(0, 50)
    .map((card) => <IdeaCardExploded key={card.id} card={card} locale={locale} />);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-6 text-center">
        <h1 className="text-2xl font-bold">{tr.ideas.title}</h1>
        <p className="mx-auto max-w-xl text-sm text-neutral-500">{tr.ideas.desc}</p>
      </header>

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

      {slides.length === 0 ? (
        <p className="text-center text-sm text-neutral-500">{tr.ideas.empty}</p>
      ) : (
        <IdeaDeck slides={slides} prevLabel={tr.deck.prev} nextLabel={tr.deck.next} />
      )}
    </main>
  );
}
