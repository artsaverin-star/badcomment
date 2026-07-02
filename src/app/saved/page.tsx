import type { Metadata } from "next";
import { getLocale } from "@/lib/i18n.server";
import { listIdeas } from "@/lib/ideas";
import { ideaContentEn } from "@/lib/regenCards";
import { getCategoryBySlug } from "@/lib/researchCategories";
import SavedIdeas, { type SavedPreview } from "@/components/SavedIdeas";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Избранное — inApp",
  robots: { index: false, follow: false },
};

export default async function SavedPage() {
  const locale = await getLocale();
  const ru = locale !== "en";

  // Preview catalog for every published idea — the client picks the saved ones
  // out of it by slug (bookmarks live in localStorage, invisible to the server).
  const items: Record<string, SavedPreview> = {};
  for (const i of listIdeas()) {
    const en = ru ? null : ideaContentEn(i.slug, locale);
    items[i.slug] = {
      category: i.category,
      categoryName: getCategoryBySlug(i.category, locale)?.name ?? i.categoryName,
      title: en?.title ?? i.title,
      oneLiner: en?.oneLiner ?? i.oneLiner,
    };
  }

  return (
    <main className="mx-auto w-full max-w-[640px] px-4 pb-24 pt-14">
      <h1 className="text-center text-display text-[var(--color-text-primary)]">{ru ? "Избранное" : "Saved"}</h1>
      <p className="mx-auto mt-3 max-w-[40ch] text-center text-callout text-[var(--color-text-secondary)]">{ru ? "Идеи, которые ты отметил закладкой." : "The ideas you bookmarked."}</p>
      <div className="mt-8">
        <SavedIdeas items={items} locale={locale} />
      </div>
    </main>
  );
}
