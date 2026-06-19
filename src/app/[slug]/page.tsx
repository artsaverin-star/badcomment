import { permanentRedirect, notFound } from "next/navigation";
import { getProductIdBySlug } from "@/lib/appSlugs";
import { getCategoryBySlug } from "@/lib/researchCategories";
import active from "@/data/active-categories.json";

export const dynamic = "force-dynamic";

// Retired: the standalone app page is gone — an app's review breakdown now lives
// in a modal on its category page (in-interface). Permanently redirect to the
// category that lists this app (keeps old links / SEO alive instead of 404ing),
// or to the catalog if it isn't in an active niche.
export default async function AppPageRedirect({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const pid = getProductIdBySlug(slug);
  if (!pid) notFound();
  for (const c of active as string[]) {
    const cat = getCategoryBySlug(c, "ru");
    if (cat?.apps.some((a) => a.productId === pid)) permanentRedirect(`/segment/${c}`);
  }
  permanentRedirect("/catalog");
}
