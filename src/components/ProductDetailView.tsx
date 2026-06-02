import { Header, IconButton, Quote, ListRow, Tag, TextBlock } from "@saverin/ui-web";
import type { IdeaCard } from "@/lib/queries";
import { formatCount } from "@/lib/format";
import { t, categoryLabelL, lovedLabelL, type Locale } from "@/lib/i18n";

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

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="9" fill="var(--color-accent-brand)" />
      <path
        d="M6 10.5l2.5 2.5L14.5 7"
        stroke="var(--color-button-primary-text)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Figma "BetterMe — Desktop" detail (node 2172:20058): an overlapping screenshot
// strip above a floating identity card, then the "what's wrong / what's loved /
// how to beat" sections laid directly on the page background. Rendered both in the
// homepage feed's inline expansion and (potentially) the standalone product route,
// entirely from the IdeaCard the feed already loaded — no extra fetch.
export default function ProductDetailView({
  card,
  locale,
}: {
  card: IdeaCard;
  locale: Locale;
}) {
  const tr = t(locale);
  const s = card.summary;
  const installLabel = card.installs ? `${formatCount(card.installs)}+` : null;

  return (
    <div className="flex w-full flex-col gap-6">
      {/* Hero: overlapping screenshots + floating identity card */}
      <div className="flex flex-col">
        {card.screenshots.length > 0 && (
          <div className="z-0 -mb-8 flex items-end justify-center gap-2 overflow-hidden px-2">
            {card.screenshots.slice(0, 4).map((src) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={src}
                src={src}
                alt=""
                className="aspect-[195/420] h-[240px] shrink-0 rounded-[var(--radius-xl)] object-cover object-top sm:h-[380px]"
              />
            ))}
          </div>
        )}

        <div className="relative z-10 flex w-full flex-col gap-6 rounded-[var(--radius-3xl)] bg-[var(--color-surface-card)] p-6 shadow-[0px_16px_32px_0px_rgba(0,0,0,0.12),0px_2px_4px_0px_rgba(0,0,0,0.06)] sm:p-8">
          <div className="flex w-full items-start gap-4">
            <div className="flex min-w-0 flex-1 items-start gap-4">
              {card.icon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={card.icon}
                  alt=""
                  className="size-16 shrink-0 rounded-[var(--radius-md)] object-cover"
                />
              ) : (
                <div className="size-16 shrink-0 rounded-[var(--radius-md)] bg-[var(--color-surface-card-subtle)]" />
              )}
              <Header
                size="M"
                as="h2"
                className="min-w-0"
                title={card.name}
                description={s?.tagline}
              />
            </div>
            <IconButton
              variant="primary"
              size="M"
              aria-label={tr.nav.seeAllReviews}
              icon={<BookmarkIcon />}
            />
          </div>

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
            {card.negativeCount > 0 && (
              <Tag tone="neutral" size="M">
                {tr.card.complaints(card.negativeCount)}
              </Tag>
            )}
          </div>

          {(s?.verdict || s?.opportunity) && (
            <TextBlock
              size="M"
              className="w-full"
              title={s?.verdict || s?.tagline || card.name}
              description={s?.opportunity}
            />
          )}
        </div>
      </div>

      {/* What's wrong: each gap with its representative quote */}
      {s && s.gaps.length > 0 && (
        <section className="flex w-full flex-col gap-4">
          <Header size="M" as="h3" title={tr.card.gaps} />
          <div className="flex flex-col gap-6">
            {s.gaps.map((gap) => (
              <div key={gap.title} className="flex flex-col gap-2">
                <TextBlock size="M" title={gap.title} description={gap.evidence} />
                {gap.quote && <Quote size="M">{gap.quote}</Quote>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* What's loved: keep these when rebuilding */}
      {s && s.loved.length > 0 && (
        <section className="flex w-full flex-col gap-4">
          <Header size="M" as="h3" title={tr.card.love} />
          <div className="flex flex-col gap-3">
            {s.loved.map((key) => (
              <ListRow key={key} size="M" icon={<CheckIcon />}>
                {lovedLabelL(locale, key)}
              </ListRow>
            ))}
          </div>
        </section>
      )}

      {/* How to beat the incumbent */}
      {s && s.wedge.length > 0 && (
        <section className="flex w-full flex-col gap-4">
          <Header size="M" as="h3" title={tr.card.howToBeat} />
          <div className="flex flex-col gap-3">
            {s.wedge.map((move) => (
              <ListRow key={move} size="M" icon={<CheckIcon />}>
                {move}
              </ListRow>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
