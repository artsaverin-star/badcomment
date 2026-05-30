import Link from "next/link";
import IdeaCardList from "@/components/IdeaCardList";
import { getIdeaCards } from "@/lib/queries";
import { getLocale, t, categoryLabelL } from "@/lib/i18n";
import { CATEGORIES } from "@/lib/categories";

export const dynamic = "force-dynamic";

function tabClass(active: boolean) {
  return `rounded-full px-3 py-1 text-sm transition-colors ${
    active
      ? "bg-red-600 text-white"
      : "bg-black/5 text-neutral-600 hover:bg-black/10 dark:bg-white/10 dark:text-neutral-300 dark:hover:bg-white/20"
  }`;
}

export default async function IdeasPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}) {
  const locale = await getLocale();
  const tr = t(locale);
  const { cat } = await searchParams;

  // Fetch the whole buildable deck once; derive tabs from what's actually
  // present and slice/filter for display without a second query.
  const all = await getIdeaCards(500);
  const present = new Set(
    all.map((c) => c.category).filter((c): c is string => c != null)
  );
  const tabs = CATEGORIES.filter((c) => present.has(c.key));

  const active = cat && present.has(cat) ? cat : null;
  const cards = active ? all.filter((c) => c.category === active) : all.slice(0, 60);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <Link href="/" className="text-sm text-neutral-500 hover:underline">
        {tr.nav.home}
      </Link>

      <header className="mb-6 mt-4">
        <h1 className="text-2xl font-bold">{tr.ideas.title}</h1>
        <p className="text-sm text-neutral-500">{tr.ideas.desc}</p>
      </header>

      <nav className="mb-8 flex flex-wrap gap-2">
        <Link href="/ideas" className={tabClass(!active)}>
          {tr.ideas.all}
        </Link>
        {tabs.map((c) => (
          <Link key={c.key} href={`/ideas?cat=${c.key}`} className={tabClass(active === c.key)}>
            {categoryLabelL(locale, c.key)}
          </Link>
        ))}
      </nav>

      {cards.length === 0 ? (
        <p className="text-sm text-neutral-500">{tr.ideas.empty}</p>
      ) : (
        <IdeaCardList cards={cards} locale={locale} />
      )}
    </main>
  );
}
