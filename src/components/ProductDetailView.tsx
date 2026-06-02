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

// Figma "BetterMe — Desktop (rebuilt)" detail (node 2172:20706): an overlapping
// screenshot strip above a floating identity card, then three bare sections laid
// on the page background — "Что не нравится" (gaps + quotes), "Что нравится"
// (monetization prose), and "Как обойти оригинал" (the wedge list). Rendered in
// the homepage feed's inline expansion, entirely from the IdeaCard the feed
// already loaded — no extra fetch.
export default function ProductDetailView({
  card,
  locale,
}: {
  card: IdeaCard;
  locale: Locale;
}) {
  const tr = t(locale);
  const s = card.summary;
  const showLoved = !s?.monetization && s != null && s.loved.length > 0;

  return (
    <div className="flex w-full flex-col gap-6">
      {/* Hero: overlapping screenshots + floating identity card */}
      <div className="flex flex-col">
        {card.screenshots.length > 0 && (
          <div className="relative z-0 -mb-8 flex items-start justify-center gap-2 px-2">
            {card.screenshots.slice(0, 4).map((src) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={src}
                src={src}
                alt=""
                className="aspect-[195/420] h-[260px] shrink-0 rounded-[var(--radius-lg)] object-cover object-top sm:h-[420px]"
              />
            ))}
          </div>
        )}

        <div className="relative z-10 flex w-full flex-col gap-6 overflow-hidden rounded-[var(--radius-3xl)] bg-[var(--color-surface-card)] p-6 shadow-[0px_16px_32px_0px_rgba(0,0,0,0.12),0px_2px_4px_0px_rgba(0,0,0,0.06)] sm:p-8">
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
            {card.installs != null && (
              <Tag tone="neutral" size="M">
                {tr.card.installs(formatCount(card.installs))}
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

      {/* Что не нравится: each gap with its representative quote */}
      {s && s.gaps.length > 0 && (
        <section className="flex w-full flex-col gap-4">
          <Header size="M" as="h3" title={tr.card.dislikes} />
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

      {/* Что нравится: the monetization read (prose), or a loved-tags fallback */}
      {(s?.monetization || showLoved) && (
        <section className="flex w-full flex-col gap-4">
          <Header size="M" as="h3" title={tr.card.love} />
          {s?.monetization ? (
            <p className="w-full [font-family:var(--brand-font-family)] text-[17px] leading-[22px] text-[var(--color-text-secondary)]">
              {s.monetization}
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {s?.loved.map((key) => (
                <ListRow key={key} size="M" icon={<CheckIcon />}>
                  {lovedLabelL(locale, key)}
                </ListRow>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Как обойти оригинал */}
      {s && s.wedge.length > 0 && (
        <section className="flex w-full flex-col gap-4">
          <Header size="M" as="h3" title={tr.card.howToBeat} />
          <div className="flex flex-col gap-4">
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
