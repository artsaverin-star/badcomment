import type { CatalogCategory } from "@/site/content/types";
import { mediaSrc, mediaSrcSet } from "@/site/content/media";
import { Badge, Card, LockBadge } from "@/site/ui";

// Research catalog card (spec 01 §3.2, spec 05 §3.6 C): cover 3:2 (decorative, alt=""),
// Georgia 22 title with a trailing lock when the viewer cannot read the topic, summary,
// «Бесплатный разбор» on the free topic (shown to Plus viewers too). Locked cards still
// link to the topic: the page shows the locked preview. Public fields only.

export const CATALOG_SIZES = "(min-width: 1280px) 380px, (min-width: 760px) 50vw, 100vw";

export function CatalogCard({
  category,
  href,
  locked,
  lockLabel,
  freeLabel,
  eager,
}: {
  category: Pick<CatalogCategory, "slug" | "name" | "summary" | "cover" | "free">;
  href: string;
  locked: boolean;
  lockLabel: string;
  freeLabel: string;
  /** Above the fold: load the image eagerly. */
  eager?: boolean;
}) {
  return (
    <Card
      href={href}
      variant="research"
      interactive
      className="ia-rs-card"
      id={`clarity-research-${category.slug}`}
    >
      {/* Pre-encoded WebP with srcset (public/media); next/image optimization is not used. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="ia-rs-card__art"
        src={mediaSrc(category.cover, 800)}
        srcSet={mediaSrcSet(category.cover)}
        sizes={CATALOG_SIZES}
        width={category.cover.width}
        height={category.cover.height}
        alt=""
        loading={eager ? "eager" : "lazy"}
        fetchPriority={eager ? "high" : undefined}
        decoding="async"
      />
      <span className="ia-rs-card__body">
        <span className="ia-rs-card__title-row">
          <span className="ia-rs-card__title">{category.name}</span>
          {locked ? <LockBadge label={lockLabel} /> : null}
        </span>
        <span className="ia-rs-card__summary">{category.summary}</span>
        {category.free ? (
          <Badge className="ia-rs-card__badge" tone="default">
            {freeLabel}
          </Badge>
        ) : null}
      </span>
    </Card>
  );
}
