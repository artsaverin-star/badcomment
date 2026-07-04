import type { Metadata } from "next";
import { getLocale } from "@/lib/i18n.server";
import { listIdeas } from "@/lib/ideas";
import { ideaContentEn } from "@/lib/regenCards";
import { getCategoryBySlug } from "@/lib/researchCategories";
import { scoreFor } from "@/lib/ideaScores";
import { hueFromSlug } from "@/lib/categoryGradient";
import { getAccess } from "@/lib/access";
import { ownsDeck } from "@/lib/unlocks";
import ideaCovers from "@/data/ideaCovers.json";
import SavedIdeas, { type SavedPreview } from "@/components/SavedIdeas";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Избранное — inApp",
  robots: { index: false, follow: false },
};

const ICONS = ["sparkles", "compass", "cards", "moon", "chart", "book", "bolt", "calendar", "person"];
const iconFor = (slug: string) => {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return ICONS[h % ICONS.length];
};

type FullIdea = {
  slug: string; category: string; title: string; oneLiner: string; gap?: string;
  idea?: { pitch?: string; features?: string[]; antiFeatures?: string[]; monetization?: string };
  reviewGrid?: { quote: string; rating: number; app: string; quoteRu?: string }[];
};

export default async function SavedPage() {
  const locale = await getLocale();
  const ru = locale !== "en";

  const access = await getAccess();
  const owner = access.unlimited || (access.user ? await ownsDeck(access.user.id) : false);
  const covers = ideaCovers as Record<string, string>;

  // Preview catalog for every published idea — the client picks the saved ones
  // out of it by slug (bookmarks live in localStorage, invisible to the server).
  // Depth (gap/pitch/features…) is included only for owners, so it can't leak.
  const items: Record<string, SavedPreview> = {};
  for (const i of listIdeas() as unknown as FullIdea[]) {
    const en = ru ? null : ideaContentEn(i.slug, locale);
    const base: SavedPreview = {
      category: i.category,
      categoryName: getCategoryBySlug(i.category, locale)?.name ?? "",
      title: en?.title ?? i.title,
      oneLiner: en?.oneLiner ?? i.oneLiner,
      icon: iconFor(i.slug),
      hue: hueFromSlug(i.category),
      cover: covers[i.slug],
      score: scoreFor(i.slug, locale) ?? undefined,
    };
    if (owner) {
      base.gap = en?.gap ?? i.gap;
      base.pitch = en?.pitch ?? i.idea?.pitch;
      base.features = en?.features ?? i.idea?.features;
      base.antiFeatures = en?.antiFeatures ?? i.idea?.antiFeatures;
      base.monetization = en?.monetization ?? i.idea?.monetization;
      base.reviewGrid = i.reviewGrid?.map((q) => ({ ...q, quote: ru && q.quoteRu ? q.quoteRu : q.quote }));
    }
    items[i.slug] = base;
  }

  return (
    <main className="mx-auto w-full max-w-[1080px] px-4 pb-24 pt-14">
      <h1 className="text-center text-display text-[var(--color-text-primary)]">{ru ? "Избранное" : "Saved"}</h1>
      <p className="mx-auto mt-3 max-w-[40ch] text-center text-callout text-[var(--color-text-secondary)]">{ru ? "Идеи, которые ты отметил закладкой." : "The ideas you bookmarked."}</p>
      <div className="mt-10">
        <SavedIdeas items={items} locale={locale} />
      </div>
    </main>
  );
}
