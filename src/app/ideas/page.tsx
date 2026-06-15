import { Header } from "@saverin/ui-web";
import { listIdeas } from "@/lib/ideas";
import { listDomains } from "@/lib/researchCategories";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n.server";
import Link from "next/link";
import IdeasBrowser, { type IdeaCard } from "@/components/IdeasBrowser";
import { getAccess } from "@/lib/access";
import { ideaCard } from "@/lib/regenCards";
import { SIGNUP_GRANT, UNLOCK_COST, tokensWord } from "@/lib/tokenConfig";

export const dynamic = "force-dynamic";

// Ideas index: searchable + category-filterable grid of review-derived app
// ideas; each card links to the full derivation (review grid → mechanisms →
// gap → pitch). Opening an idea spends tokens (see UnlockGate).
export default async function IdeasPage() {
  const locale = await getLocale();
  const tr = t(locale);
  const access = await getAccess();
  const all = listIdeas();

  // category slug → its top-level domain, for the icon filter pills.
  const catToDomain = new Map<string, { slug: string; name: string }>();
  for (const d of listDomains(locale)) {
    for (const c of d.categories) catToDomain.set(c.slug, { slug: d.slug, name: d.name });
  }

  const ideas: IdeaCard[] = all.map((i) => {
    const dom = catToDomain.get(i.category);
    const ov = ideaCard(i.slug);
    return {
      slug: i.slug,
      category: i.category,
      categoryName: i.categoryName,
      domain: dom?.slug ?? "other",
      domainName: dom?.name ?? "Прочее",
      title: ov?.title ?? i.title,
      oneLiner: ov?.oneLiner ?? i.oneLiner,
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
      <Link
        href="/tokens"
        className="mx-auto mb-6 flex max-w-2xl items-center gap-3 rounded-[var(--radius-xl)] border border-[var(--color-border-strong)] bg-[var(--color-surface-card)] px-4 py-3 transition-colors hover:border-[var(--color-text-brand)]"
      >
        <span className="flex-1 text-callout text-[var(--color-text-primary)]">
          {access.loggedIn ? (
            access.unlimited ? (
              <>У тебя полный доступ ко всем идеям.</>
            ) : (
              <>
                Баланс: <b className="tabular-nums">{access.balance}</b> {tokensWord(access.balance)}. Идея — {UNLOCK_COST.idea} {tokensWord(UNLOCK_COST.idea)}.
              </>
            )
          ) : (
            <>
              Зарегистрируйся и получи <b>{SIGNUP_GRANT}</b> {tokensWord(SIGNUP_GRANT)} на старте.
            </>
          )}
        </span>
        <span className="shrink-0 text-footnote font-semibold text-[var(--color-text-brand)]">
          {access.loggedIn && !access.unlimited ? "Пополнить →" : "Подробнее →"}
        </span>
      </Link>
      {ideas.length === 0 ? (
        <p className="mt-10 text-center text-callout text-[var(--color-text-tertiary)]">{tr.ideas.empty}</p>
      ) : (
        <IdeasBrowser ideas={ideas} />
      )}
    </main>
  );
}
