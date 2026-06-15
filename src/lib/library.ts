import { prisma } from "./prisma";
import { getCategoryBySlug, getAppMetaByProductId } from "./researchCategories";
import { getIdea } from "./ideas";
import { getProductIdBySlug } from "./appSlugs";

export type LibItem = { slug: string; name: string; href: string; icon?: string | null; sub?: string };

// What a user has bought with tokens — direct unlocks (cost > 0), so bundle
// children (category → its apps/ideas, written at cost 0) aren't double-listed.
export async function getLibrary(
  userId: string,
): Promise<{ categories: LibItem[]; ideas: LibItem[]; apps: LibItem[] }> {
  const rows = await prisma.unlock.findMany({
    where: { userId, cost: { gt: 0 } },
    orderBy: { createdAt: "desc" },
  });

  const categories: LibItem[] = [];
  const ideas: LibItem[] = [];
  const apps: LibItem[] = [];

  for (const r of rows) {
    if (r.type === "category") {
      const c = getCategoryBySlug(r.slug, "ru");
      categories.push({ slug: r.slug, name: c?.name ?? r.slug, href: `/segment/${r.slug}`, sub: "весь жанр" });
    } else if (r.type === "idea") {
      const i = getIdea(r.slug);
      ideas.push({ slug: r.slug, name: i?.title ?? r.slug, href: `/ideas/${r.slug}`, sub: i?.categoryName });
    } else if (r.type === "app") {
      const pid = getProductIdBySlug(r.slug);
      const m = pid ? getAppMetaByProductId(pid) : null;
      apps.push({ slug: r.slug, name: m?.name ?? r.slug, href: `/${r.slug}`, icon: m?.icon ?? null });
    }
  }

  return { categories, ideas, apps };
}
