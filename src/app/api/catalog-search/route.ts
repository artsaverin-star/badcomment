import { NextResponse } from "next/server";
import { RATING_BY_SLUG } from "@/data/peoplesRating";
import { isActiveCategory } from "@/lib/categoryVisibility";
import { listDomains } from "@/lib/researchCategories";
import { getSlugByProductId } from "@/lib/appSlugs";
import { hasInsight } from "@/lib/readyApps";
import { getLocale } from "@/lib/i18n.server";

export const dynamic = "force-dynamic";

type Hit = { type: "category" | "app"; name: string; slug: string; sub?: string; icon?: string | null };
type RApp = { icon?: string | null; ratings?: number };
type RSet = { name: string; nameEn?: string; apps?: RApp[] };

// Fast in-memory search over the local catalog. Categories come from the
// authoritative people's-rating set (all active niches, matched on both the RU
// and EN name so «рыбалка» and "fishing" both hit); apps come from the analyzed
// catalog. No external calls — used by the header search box.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim().toLowerCase();
  if (q.length < 2) return NextResponse.json({ results: [] });

  // Prefer the caller's locale (the header box passes it) so names match the
  // page language; fall back to the cookie.
  const lParam = url.searchParams.get("l");
  const locale = lParam === "ru" || lParam === "en" ? lParam : await getLocale();
  const ru = locale !== "en";
  const cats: Hit[] = [];
  const apps: Hit[] = [];
  const seenApp = new Set<string>();

  // Categories: every active niche, matched on RU + EN name.
  for (const [slug, raw] of Object.entries(RATING_BY_SLUG as Record<string, RSet>)) {
    if (!isActiveCategory(slug)) continue;
    const nameRu = raw.name || "";
    const nameEn = raw.nameEn || "";
    if (!(nameRu.toLowerCase().includes(q) || nameEn.toLowerCase().includes(q))) continue;
    const icon = [...(raw.apps ?? [])].sort((a, b) => (b.ratings || 0) - (a.ratings || 0)).find((a) => a.icon)?.icon ?? null;
    cats.push({ type: "category", name: (ru ? nameRu : nameEn) || nameRu, slug: `/segment/${slug}`, sub: ru ? "разбор ниши" : "niche breakdown", icon });
  }

  // Apps: analyzed apps that have their own insight page AND live in an active
  // category. The app page (resolve() in /[slug]) only renders when the app is
  // found inside an active niche, so an app from a shelved niche (e.g. Bark in
  // the unpublished parental-controls) would 404 — never surface those.
  for (const d of listDomains(locale)) {
    for (const c of d.categories) {
      if (!isActiveCategory(c.slug)) continue;
      for (const a of c.apps) {
        if (!a.productId || !hasInsight(a.productId)) continue;
        const slug = getSlugByProductId(a.productId);
        if (!slug || seenApp.has(slug)) continue;
        if (a.name.toLowerCase().includes(q)) {
          seenApp.add(slug);
          apps.push({ type: "app", name: a.name, slug: `/${slug}`, sub: c.name, icon: a.icon ?? null });
        }
      }
    }
  }

  // Prefix matches first, then the rest; categories before apps; cap the list.
  const rank = (h: Hit) => (h.name.toLowerCase().startsWith(q) ? 0 : 1);
  const results = [...cats.sort((a, b) => rank(a) - rank(b)), ...apps.sort((a, b) => rank(a) - rank(b))].slice(0, 8);
  return NextResponse.json({ results });
}
