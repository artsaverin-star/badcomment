import type { Locale } from "@/site/i18n/locales";
import { AppMark, AppStoreBadge } from "@/site/ui";
import { researchStrings } from "./strings";

// App Store promo card on the catalog and on every topic page (DECISIONS §12–13). While the
// app is in review, the badge opens the "in review" dialog (AppStoreBadge handles it).
// No prices or purchase wording here.

export function AppPromo({ locale }: { locale: Locale }) {
  const s = researchStrings[locale];
  return (
    <aside className="ia-rs-promo" aria-label={s.promoTitle}>
      <AppMark size={54} className="ia-rs-promo__mark" />
      <div className="ia-rs-promo__text">
        <p className="ia-rs-promo__title">{s.promoTitle}</p>
        <p className="ia-rs-promo__body">{s.promoBody}</p>
      </div>
      <AppStoreBadge className="ia-rs-promo__badge" />
    </aside>
  );
}
