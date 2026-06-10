import Link from "next/link";
import { Header } from "@saverin/ui-web";
import { listIdeas } from "@/lib/ideas";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n.server";

export const dynamic = "force-dynamic";

// Ideas index: each card is a review-derived app idea; the detail page shows
// the full derivation chain (review grid → mechanisms → gap → pitch).
export default async function IdeasPage() {
  const locale = await getLocale();
  const tr = t(locale);
  const ideas = listIdeas();

  return (
    <main className="mx-auto w-full max-w-[720px] overflow-x-clip px-4 py-10">
      <Header
        size="L"
        as="h1"
        className="mb-3 items-center text-center"
        title={tr.ideas.title}
        description={<span className="mx-auto block max-w-2xl">{tr.ideas.desc}</span>}
      />

      {ideas.length === 0 ? (
        <p className="mt-10 text-center text-[14px] text-[var(--color-text-tertiary)]">
          {tr.ideas.empty}
        </p>
      ) : (
        <div className="mt-8 flex flex-col gap-3">
          {ideas.map((idea) => (
            <Link
              key={idea.slug}
              href={`/ideas/${idea.slug}`}
              className="flex flex-col gap-2 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-5 transition-colors hover:border-[var(--color-text-tertiary)]"
            >
              <div className="text-[12px] font-semibold uppercase tracking-wide text-[var(--color-text-brand)]">
                {idea.categoryName}
              </div>
              <div className="text-[19px] font-semibold leading-snug text-[var(--color-text-primary)]">
                {idea.title}
              </div>
              <p className="text-[14px] leading-relaxed text-[var(--color-text-secondary)]">
                {idea.oneLiner}
              </p>
              <div className="mt-1 text-[12px] text-[var(--color-text-tertiary)]">
                {idea.stats.apps} приложений · {idea.stats.reviews.toLocaleString("ru-RU")} отзывов ·{" "}
                {idea.stats.observations.toLocaleString("ru-RU")} наблюдений
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
