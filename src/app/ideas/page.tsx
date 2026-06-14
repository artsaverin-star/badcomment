import { Header } from "@saverin/ui-web";
import { listIdeas } from "@/lib/ideas";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n.server";
import IdeasBrowser, { type IdeaCard } from "@/components/IdeasBrowser";

export const dynamic = "force-dynamic";

// Ideas index: searchable + category-filterable grid of review-derived app
// ideas; each card links to the full derivation (review grid → mechanisms →
// gap → pitch).
export default async function IdeasPage() {
  const locale = await getLocale();
  const tr = t(locale);
  const ideas: IdeaCard[] = listIdeas().map((i) => ({
    slug: i.slug,
    category: i.category,
    categoryName: i.categoryName,
    title: i.title,
    oneLiner: i.oneLiner,
    stats: i.stats,
  }));

  return (
    <main className="mx-auto w-full max-w-[720px] overflow-x-clip px-4 py-10">
      <Header
        size="L"
        as="h1"
        className="mb-8 items-center text-center"
        title={tr.ideas.title}
        description={<span className="mx-auto block max-w-2xl">{tr.ideas.desc}</span>}
      />
      {ideas.length === 0 ? (
        <p className="mt-10 text-center text-callout text-[var(--color-text-tertiary)]">{tr.ideas.empty}</p>
      ) : (
        <IdeasBrowser ideas={ideas} />
      )}
    </main>
  );
}
