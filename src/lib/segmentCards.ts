import { prisma } from "./prisma";
import { getSegments } from "./segments";
import { getTaxonomy } from "./taxonomy";
import type { Locale } from "./i18n";

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

  const cards = segments.map((seg): SegmentCard => {
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
      classified: getTaxonomy(seg.slug) != null,
    };
  });

  // Classified genres lead; within each band, biggest review pile first.
  cards.sort(
    (a, b) => Number(b.classified) - Number(a.classified) || b.reviewCount - a.reviewCount,
  );
  return cards;
}
