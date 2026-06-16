import { Header } from "@saverin/ui-web";
import { listIdeas } from "@/lib/ideas";
import { listDomains } from "@/lib/researchCategories";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n.server";
import IdeasBrowser, { type IdeaCard } from "@/components/IdeasBrowser";
import { ideaCard } from "@/lib/regenCards";
import { getAccess } from "@/lib/access";
import { UNLOCK_COST } from "@/lib/tokenConfig";

export const dynamic = "force-dynamic";

// Ideas index: searchable + category-filterable grid of review-derived app
// ideas; each card links to the full derivation (review grid → mechanisms →
// gap → pitch). Opening an idea spends tokens (see UnlockGate).
export default async function IdeasPage() {
  const locale = await getLocale();
  const tr = t(locale);
  const all = listIdeas();
  const access = await getAccess();

  // category slug → its top-level domain (for icon pills) + localized category name.
  const catToDomain = new Map<string, { slug: string; name: string }>();
  const catName = new Map<string, string>();
  for (const d of listDomains(locale)) {
    for (const c of d.categories) {
      catToDomain.set(c.slug, { slug: d.slug, name: d.name });
      catName.set(c.slug, c.name);
    }
  }

  // The idea's name + pitch are the paid part: for locked ideas we keep the
  // category + stats (the teaser) but never ship the title/oneLiner to the client.
  const ideas: IdeaCard[] = all.map((i) => {
    const dom = catToDomain.get(i.category);
    const ov = ideaCard(i.slug, locale);
    const locked = !access.has("idea", i.slug);
    return {
      slug: i.slug,
      category: i.category,
      categoryName: catName.get(i.category) ?? i.categoryName,
      domain: dom?.slug ?? "other",
      domainName: dom?.name ?? "Прочее",
      title: locked ? "" : ov?.title ?? i.title,
      oneLiner: locked ? "" : ov?.oneLiner ?? i.oneLiner,
      stats: i.stats,
      locked,
      cost: UNLOCK_COST.idea,
    };
  });

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
        <IdeasBrowser ideas={ideas} loggedIn={access.loggedIn} balance={access.balance} locale={locale} />
      )}
    </main>
  );
}
