import Link from "next/link";
import { Card, Header, Tag, TextBlock, buttonVariants, cn } from "@saverin/ui-web";
import type { IdeaCard } from "@/lib/queries";
import { t, categoryLabelL, opportunityTypeLabelL, type Locale } from "@/lib/i18n";

// Deck teaser (Figma "Promo card", node 2115:7814): brand topbar, tags, a strip
// of store screenshots, a single insight TextBlock, and a CTA into the detail
// page. The full breakdown (gaps / pros / how-to-beat) lives on /product/[id].
export default function IdeaCardDeck({
  card,
  locale,
}: {
  card: IdeaCard;
  locale: Locale;
}) {
  const tr = t(locale);
  const s = card.summary;

  return (
    <Card className="mx-auto w-full max-w-[420px]">
      {/* Brand topbar: app icon + name + tagline */}
      <div className="flex items-center gap-3">
        {card.icon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={card.icon}
            alt=""
            className="h-12 w-12 shrink-0 rounded-[var(--radius-md)]"
          />
        ) : (
          <div className="h-12 w-12 shrink-0 rounded-[var(--radius-md)] bg-[var(--color-surface-card-subtle)]" />
        )}
        <Header
          size="XS"
          as="h2"
          className="min-w-0"
          title={<span className="truncate">{card.name}</span>}
          description={s?.tagline}
        />
      </div>

      {/* Tags: opportunity type (brand), category, demand */}
      <div className="flex flex-wrap gap-2">
        {s?.opportunityType && (
          <Tag tone="brand" size="M">
            {opportunityTypeLabelL(locale, s.opportunityType)}
          </Tag>
        )}
        {card.category && (
          <Tag tone="neutral" size="M">
            {categoryLabelL(locale, card.category)}
          </Tag>
        )}
        <Tag tone="neutral" size="M">
          {card.demandLabel}
        </Tag>
      </div>

      {/* Store screenshots */}
      {card.screenshots.length > 0 && (
        <div className="flex gap-2 overflow-x-auto">
          {card.screenshots.slice(0, 3).map((src) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={src}
              src={src}
              alt=""
              className="h-[200px] w-[96px] shrink-0 rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)] object-cover object-top"
            />
          ))}
        </div>
      )}

      {/* The single insight: verdict + the opening */}
      {(s?.verdict || s?.opportunity) && (
        <TextBlock
          size="M"
          title={s?.verdict || s?.tagline || card.name}
          description={s?.opportunity}
        />
      )}

      <Link
        href={`/product/${card.id}`}
        className={cn(buttonVariants({ variant: "primary", size: "L" }), "w-full")}
      >
        {tr.nav.seeAllReviews}
      </Link>
    </Card>
  );
}
