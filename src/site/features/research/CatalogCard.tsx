import type { CatalogCategory } from "@/site/content/types";
import { mediaSrc, mediaSrcSet } from "@/site/content/media";
import { Badge, Card, LockBadge } from "@/site/ui";

// Research catalog card (spec 01 §3.2, spec 05 §3.6 C): cover 3:2 (decorative, alt=""),
// Georgia 22 title with a trailing lock when the viewer cannot read the topic, summary,
// «Бесплатный разбор» on the free topic (shown to Plus viewers too). Locked cards still
// link to the topic: the page shows the locked preview. Public fields only.
// Accessibility as ClarityCatalogs.swift:151-155: name = title (+ «Бесплатный разбор»),
// description = summary (+ «Полный разбор в Plus»); the title is a heading so the catalog can
// be navigated by headings (a11y m8).

export const CATALOG_SIZES = "(min-width: 1280px) 380px, (min-width: 760px) 50vw, 100vw";

export function CatalogCard({
  category,
  href,
  locked,
  lockLabel,
  freeLabel,
  eager,
  priority,
}: {
  category: Pick<CatalogCategory, "slug" | "name" | "summary" | "cover" | "free">;
  href: string;
  locked: boolean;
  lockLabel: string;
  freeLabel: string;
  /** Near the fold: load the image eagerly. */
  eager?: boolean;
  /** The likely LCP image (the first card): fetch it with high priority. */
  priority?: boolean;
}) {
  const id = `clarity-research-${category.slug}`;
  const ids = { title: `${id}-title`, summary: `${id}-summary`, lock: `${id}-lock`, free: `${id}-free` };
  return (
    <Card
      href={href}
      variant="research"
      interactive
      className="ia-rs-card"
      id={id}
      aria-labelledby={category.free ? `${ids.title} ${ids.free}` : ids.title}
      aria-describedby={locked ? `${ids.summary} ${ids.lock}` : ids.summary}
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
        loading={eager || priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        decoding={priority ? undefined : "async"}
      />
      <div className="ia-rs-card__body">
        <div className="ia-rs-card__title-row">
          <h2 className="ia-rs-card__title" id={ids.title}>
            {category.name}
          </h2>
          {locked ? (
            <>
              <LockBadge />
              <span id={ids.lock} hidden>
                {lockLabel}
              </span>
            </>
          ) : null}
        </div>
        <p className="ia-rs-card__summary" id={ids.summary}>
          {category.summary}
        </p>
        {category.free ? (
          <Badge className="ia-rs-card__badge" tone="default">
            <span id={ids.free}>{freeLabel}</span>
          </Badge>
        ) : null}
      </div>
    </Card>
  );
}
