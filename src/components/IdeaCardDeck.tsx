import Link from "next/link";
import {
  Card,
  Header,
  IconButton,
  Tag,
  TextBlock,
  buttonVariants,
  cn,
} from "@saverin/ui-web";
import { formatCount, type IdeaCard } from "@/lib/queries";
import { t, categoryLabelL, type Locale } from "@/lib/i18n";

function BookmarkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 4h12a1 1 0 0 1 1 1v15l-7-4-7 4V5a1 1 0 0 1 1-1z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20c0-3.3 3.6-6 8-6s8 2.7 8 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2l2.9 6.3 6.9.6-5.2 4.6 1.6 6.7L12 17.3 5.8 20.8l1.6-6.7L2.2 8.9l6.9-.6L12 2z" />
    </svg>
  );
}

// Figma "Promo card" (node 2115:7814): brand topbar with logo + name + bookmark,
// a full-width tagline, info tags (category / installs / rating), a strip of store
// screenshots, the insight TextBlock, and a CTA into the detail page. Rendered in
// the homepage feed grid; the full breakdown lives on /product/[id].
export default function IdeaCardDeck({
  card,
  locale,
}: {
  card: IdeaCard;
  locale: Locale;
}) {
  const tr = t(locale);
  const s = card.summary;
  const installLabel = card.installs
    ? `${formatCount(card.installs)}+`
    : card.ratingCount
      ? formatCount(card.ratingCount)
      : null;

  return (
    <Card className="h-full w-full gap-4">
      {/* Brand block: topbar (logo + name + bookmark) and the full-width tagline */}
      <div className="flex w-full flex-col gap-2">
        <div className="flex w-full items-start gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {card.icon ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={card.icon}
                alt=""
                className="size-10 shrink-0 rounded-[var(--radius-lg)] object-cover"
              />
            ) : (
              <div className="size-10 shrink-0 rounded-[var(--radius-lg)] bg-[var(--color-surface-card-subtle)]" />
            )}
            <Header
              size="M"
              as="h2"
              className="min-w-0"
              title={<span className="block truncate">{card.name}</span>}
            />
          </div>
          <IconButton
            variant="secondary"
            size="M"
            aria-label={tr.nav.seeAllReviews}
            icon={<BookmarkIcon />}
          />
        </div>
        {s?.tagline && (
          <p className="[font-family:var(--brand-font-family)] text-[17px] leading-[22px] text-[var(--color-text-secondary)]">
            {s.tagline}
          </p>
        )}
      </div>

      {/* Info tags: category, install volume, average rating */}
      <div className="flex w-full flex-wrap gap-2">
        {card.category && (
          <Tag tone="neutral" size="M">
            {categoryLabelL(locale, card.category)}
          </Tag>
        )}
        {installLabel && (
          <Tag tone="neutral" size="M" iconLeft={<PersonIcon />}>
            {installLabel}
          </Tag>
        )}
        {card.avgRating != null && (
          <Tag tone="neutral" size="M" iconLeft={<StarIcon />}>
            {card.avgRating.toFixed(1)}
          </Tag>
        )}
      </div>

      {/* Store screenshots */}
      {card.screenshots.length > 0 && (
        <div className="flex h-[160px] w-full items-center gap-2 overflow-hidden">
          {card.screenshots.slice(0, 4).map((src) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={src}
              src={src}
              alt=""
              className="aspect-[195/420] h-full shrink-0 rounded-[var(--radius-sm)] object-cover object-top"
            />
          ))}
        </div>
      )}

      {/* The single insight: verdict + the opening */}
      {(s?.verdict || s?.opportunity) && (
        <TextBlock
          size="M"
          className="w-full"
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
