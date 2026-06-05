import { prisma } from "./prisma";
import { getSegments, getSegmentBySlug } from "./segments";
import { getTaxonomy } from "./taxonomy";
import type { Locale } from "./i18n";
import themesData from "@/data/segment-insight-themes.json";

// Segments with an authored insight-meta-themes mapping (qualitative-extraction
// path), in addition to the classical taxonomy path.
const INSIGHT_SEGMENTS = new Set(Object.keys(themesData as Record<string, unknown>));

export function hasSegmentSignal(slug: string): boolean {
  return getTaxonomy(slug) != null || INSIGHT_SEGMENTS.has(slug);
}

// The /market2 landing: one card per app segment, showing how much real review
// signal sits behind it ("N reviews across M apps"). `classified` flags the few
// genres with a needs taxonomy (language-learning, translators) — only those
// open into a real gap view; the rest are honest stubs until they're labeled.
export type SegmentCard = {
  slug: string;
  name: string;
  appCount: number;
  reviewCount: number;
  icons: string[];
  classified: boolean;
};

export async function getSegmentCards(locale: Locale): Promise<SegmentCard[]> {
  const segments = getSegments(locale);
  const allIds = [...new Set(segments.flatMap((s) => s.appIds))];

  const products = await prisma.product.findMany({
    where: { id: { in: allIds } },
    select: {
      id: true,
      icon: true,
      listings: { select: { _count: { select: { reviews: true } } } },
    },
  });

  const info = new Map(
    products.map((p) => [
      p.id,
      { icon: p.icon, reviews: p.listings.reduce((s, l) => s + l._count.reviews, 0) },
    ]),
  );

  // Only segments with real signal get a card — either a taxonomy (semantic
  // classification) or an authored insight-meta-themes mapping (qualitative).
  const cards = segments
    .filter((seg) => hasSegmentSignal(seg.slug))
    .map((seg): SegmentCard => {
      let appCount = 0;
      let reviewCount = 0;
      const icons: string[] = [];
      for (const id of seg.appIds) {
        const p = info.get(id);
        if (!p) continue;
        appCount++;
        reviewCount += p.reviews;
        if (p.icon && icons.length < 5) icons.push(p.icon);
      }
      return {
        slug: seg.slug,
        name: seg.name,
        appCount,
        reviewCount,
        icons,
        classified: true,
      };
    });

  // Biggest review pile first.
  cards.sort((a, b) => b.reviewCount - a.reviewCount);
  return cards;
}

// One app inside a segment, with its raw negative-review volume — the drill-down
// strip on a segment page. `negative` is the count of Review rows (negatives)
// across the product's listings; tap through to /product/<id> to read them.
export type SegmentApp = {
  id: string;
  name: string;
  icon: string | null;
  negative: number;
};

export async function getSegmentApps(slug: string, locale: Locale): Promise<SegmentApp[]> {
  const segment = getSegmentBySlug(slug, locale);
  if (!segment) return [];

  const products = await prisma.product.findMany({
    where: { id: { in: segment.appIds } },
    select: {
      id: true,
      name: true,
      icon: true,
      listings: { select: { _count: { select: { reviews: true } } } },
    },
  });

  const apps = products.map((p): SegmentApp => ({
    id: p.id,
    name: p.name,
    icon: p.icon,
    negative: p.listings.reduce((s, l) => s + l._count.reviews, 0),
  }));
  apps.sort((a, b) => b.negative - a.negative);
  return apps;
}
