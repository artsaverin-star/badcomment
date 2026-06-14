import { Header } from "@saverin/ui-web";
import { listIdeas } from "@/lib/ideas";
import { listDomains } from "@/lib/researchCategories";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n.server";
import Link from "next/link";
import IdeasBrowser, { type IdeaCard } from "@/components/IdeasBrowser";
import { isPremium, isFreeCategory } from "@/lib/premium";

export const dynamic = "force-dynamic";

// Ideas index: searchable + category-filterable grid of review-derived app
// ideas; each card links to the full derivation (review grid → mechanisms →
// gap → pitch).
export default async function IdeasPage() {
  const locale = await getLocale();
  const tr = t(locale);
  const premium = await isPremium();
  const all = listIdeas();
  const visible = premium ? all : all.filter((i) => isFreeCategory(i.category));
  const lockedCount = all.length - visible.length;

  // category slug → its top-level domain, for the icon filter pills.
  const catToDomain = new Map<string, { slug: string; name: string }>();
  for (const d of listDomains(locale)) {
    for (const c of d.categories) catToDomain.set(c.slug, { slug: d.slug, name: d.name });
  }

  const ideas: IdeaCard[] = visible.map((i) => {
    const dom = catToDomain.get(i.category);
    return {
      slug: i.slug,
      category: i.category,
      categoryName: i.categoryName,
      domain: dom?.slug ?? "other",
      domainName: dom?.name ?? "Прочее",
      title: i.title,
      oneLiner: i.oneLiner,
      stats: i.stats,
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
      {!premium && lockedCount > 0 && (
        <Link
          href="/premium"
          className="mx-auto mb-6 flex max-w-2xl items-center gap-3 rounded-[var(--radius-xl)] border border-[var(--color-text-brand)] bg-[color-mix(in_srgb,var(--color-text-brand)_8%,transparent)] px-4 py-3"
        >
          <span className="text-[18px]">🔓</span>
          <span className="flex-1 text-callout text-[var(--color-text-primary)]">
            Ещё <b>{lockedCount}</b> идей открыто по премиум-подписке.
          </span>
          <span className="shrink-0 text-footnote font-semibold text-[var(--color-text-brand)]">Подключить →</span>
        </Link>
      )}
      {ideas.length === 0 ? (
        <p className="mt-10 text-center text-callout text-[var(--color-text-tertiary)]">{tr.ideas.empty}</p>
      ) : (
        <IdeasBrowser ideas={ideas} />
      )}
    </main>
  );
}
