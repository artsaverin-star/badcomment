import { Header, Quote, ListRow, TextBlock } from "@saverin/ui-web";
import type { FeedCard } from "@/lib/deck";
import { t, lovedLabelL, type Locale } from "@/lib/i18n";

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

// The detail sections that unfold inside an expanded feed card (Figma node
// 2172:21592): three bare sections laid on the card surface — "Что не нравится"
// (gaps + quotes), "Что нравится" (monetization prose, or a loved-tags
// fallback), and "Как обойти оригинал" (the wedge list). The card itself already
// renders the identity (logo, name, tags, screenshots, verdict), so this starts
// straight at the breakdown.
export default function ProductDetailView({
  card,
  locale,
}: {
  card: FeedCard;
  locale: Locale;
}) {
  const tr = t(locale);
  const s = card.summary;
  if (!s) return null;
  const showLoved = !s.monetization && s.loved.length > 0;

  return (
    <div className="flex w-full flex-col gap-6">
      {/* Что не нравится: each gap with its representative quote */}
      {s.gaps.length > 0 && (
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
      {(s.monetization || showLoved) && (
        <section className="flex w-full flex-col gap-4">
          <Header size="M" as="h3" title={tr.card.love} />
          {s.monetization ? (
            <p className="w-full [font-family:var(--brand-font-family)] text-[17px] leading-[22px] text-[var(--color-text-secondary)]">
              {s.monetization}
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {s.loved.map((key) => (
                <ListRow key={key} size="M" icon={<CheckIcon />}>
                  {lovedLabelL(locale, key)}
                </ListRow>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Как обойти оригинал */}
      {s.wedge.length > 0 && (
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
