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
import type { IdeaCard } from "@/lib/queries";
import { formatCount } from "@/lib/format";
import { t, categoryLabelL, type Locale } from "@/lib/i18n";

const CTA_CLASS = "h-[54px] w-full text-[17px] leading-[22px]";

function BookmarkIcon() {
  return (
    <svg viewBox="0 0 13.6667 17" fill="none" aria-hidden="true">
      <path
        d="M12.6667 16L6.83333 11.8333L1 16V2.66667C1 2.22464 1.17559 1.80072 1.48816 1.48816C1.80072 1.17559 2.22464 1 2.66667 1H11C11.442 1 11.866 1.17559 12.1785 1.48816C12.4911 1.80072 12.6667 2.22464 12.6667 2.66667V16Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg viewBox="0 0 10.5003 11.667" fill="none" aria-hidden="true">
      <path
        d="M9.91683 11.0835V9.91683C9.91683 9.29799 9.671 8.7045 9.23342 8.26692C8.79583 7.82933 8.20234 7.5835 7.5835 7.5835H2.91683C2.29799 7.5835 1.7045 7.82933 1.26692 8.26692C0.829333 8.7045 0.5835 9.29799 0.5835 9.91683V11.0835M7.5835 2.91683C7.5835 4.2055 6.53883 5.25017 5.25017 5.25017C3.9615 5.25017 2.91683 4.2055 2.91683 2.91683C2.91683 1.62817 3.9615 0.5835 5.25017 0.5835C6.53883 0.5835 7.5835 1.62817 7.5835 2.91683Z"
        stroke="currentColor"
        strokeWidth="1.167"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg viewBox="0 0 12.8337 12.262" fill="none" aria-hidden="true">
      <path
        d="M6.41685 0.5835L8.21935 4.23517L12.2502 4.82433L9.33352 7.66517L10.0219 11.6785L6.41685 9.78267L2.81185 11.6785L3.50018 7.66517L0.583517 4.82433L4.61435 4.23517L6.41685 0.5835Z"
        stroke="currentColor"
        strokeWidth="1.167"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
  onOpen,
  expanded = false,
}: {
  card: IdeaCard;
  locale: Locale;
  // When provided (feed context), the CTA toggles an inline detail view instead
  // of navigating to /product/[id]. Omitted elsewhere → CTA stays a real link.
  onOpen?: () => void;
  expanded?: boolean;
}) {
  const tr = t(locale);
  const s = card.summary;
  const installLabel = card.installs
    ? `${formatCount(card.installs)}+`
    : card.ratingCount
      ? formatCount(card.ratingCount)
      : null;

  return (
    <Card className="w-full gap-4 p-4 sm:p-8">
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
        <div className="flex h-[280px] w-full items-center gap-2 overflow-hidden">
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

      {onOpen ? (
        <button
          type="button"
          onClick={onOpen}
          aria-expanded={expanded}
          className={cn(buttonVariants({ variant: "primary", size: "L" }), CTA_CLASS)}
        >
          {expanded ? tr.nav.collapse : tr.nav.more}
        </button>
      ) : (
        <Link
          href={`/product/${card.id}`}
          className={cn(buttonVariants({ variant: "primary", size: "L" }), CTA_CLASS)}
        >
          {tr.nav.more}
        </Link>
      )}
    </Card>
  );
}
