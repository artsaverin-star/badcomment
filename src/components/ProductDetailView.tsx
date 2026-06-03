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
  size = "M",
}: {
  card: FeedCard;
  locale: Locale;
  size?: "S" | "M";
}) {
  const tr = t(locale);
  const s = card.summary;
  if (!s) return null;

  return (
    <div className="flex w-full flex-col gap-6">
      {/* Что не нравится: each gap with its quote, then the pricing/ads pain */}
      {(s.gaps.length > 0 || s.monetization) && (
        <section className="flex w-full flex-col gap-4">
          <Header size={size} as="h3" title={tr.card.dislikes} />
          <div className="flex flex-col gap-6">
            {s.gaps.map((gap) => (
              <div key={gap.title} className="flex flex-col gap-2">
                <TextBlock size={size} title={gap.title} description={gap.evidence} />
                {gap.quote && <Quote size={size}>{gap.quote}</Quote>}
              </div>
            ))}
            {s.monetization && (
              <p className="w-full [font-family:var(--brand-font-family)] text-[17px] leading-[22px] text-[var(--color-text-secondary)]">
                {s.monetization}
              </p>
            )}
          </div>
        </section>
      )}

      {/* Что нравится: what users genuinely like and a clone must keep */}
      {s.loved.length > 0 && (
        <section className="flex w-full flex-col gap-4">
          <Header size={size} as="h3" title={tr.card.love} />
          <div className="flex flex-col gap-3">
            {s.loved.map((key) => (
              <ListRow key={key} size={size} icon={<CheckIcon />}>
                {lovedLabelL(locale, key)}
              </ListRow>
            ))}
          </div>
        </section>
      )}

      {/* Как обойти оригинал */}
      {s.wedge.length > 0 && (
        <section className="flex w-full flex-col gap-4">
          <Header size={size} as="h3" title={tr.card.howToBeat} />
          <div className="flex flex-col gap-4">
            {s.wedge.map((move) => (
              <ListRow key={move} size={size} icon={<CheckIcon />}>
                {move}
              </ListRow>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
