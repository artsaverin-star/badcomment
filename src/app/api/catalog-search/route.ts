import { NextResponse } from "next/server";
import { listDomains } from "@/lib/researchCategories";
import { getSlugByProductId } from "@/lib/appSlugs";
import { hasInsight } from "@/lib/readyApps";
import { getLocale } from "@/lib/i18n.server";

export const dynamic = "force-dynamic";

type Hit = { type: "category" | "app"; name: string; slug: string; sub?: string };

// Fast in-memory search over the local catalog (categories + analyzed apps).
// No external calls — used by the header search box.
export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") || "").trim().toLowerCase();
  if (q.length < 2) return NextResponse.json({ results: [] });

  const locale = await getLocale();
  const cats: Hit[] = [];
  const apps: Hit[] = [];
  const seenApp = new Set<string>();

  for (const d of listDomains(locale)) {
    for (const c of d.categories) {
      if (c.name.toLowerCase().includes(q)) {
        cats.push({ type: "category", name: c.name, slug: `/segment/${c.slug}`, sub: d.name });
      }
      for (const a of c.apps) {
        if (!a.productId || !hasInsight(a.productId)) continue;
        const slug = getSlugByProductId(a.productId);
        if (!slug || seenApp.has(slug)) continue;
        if (a.name.toLowerCase().includes(q)) {
          seenApp.add(slug);
          apps.push({ type: "app", name: a.name, slug: `/${slug}`, sub: c.name });
        }
      }
    }
  }

  // Prefix matches first, then the rest; cap the list.
  const rank = (h: Hit) => (h.name.toLowerCase().startsWith(q) ? 0 : 1);
  const results = [...cats, ...apps].sort((a, b) => rank(a) - rank(b)).slice(0, 8);
  return NextResponse.json({ results });
}
