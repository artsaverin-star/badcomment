import type { Locale } from "@/site/i18n/locales";
import { AppMark, AppStoreBadge, Card, Eyebrow } from "@/site/ui";
import { ideasStrings } from "./strings";
import "./ideas.css";

// «Download on the App Store» card for the ideas catalog and every idea page (DECISIONS §12).
// While the app is in review the badge opens the "in review" dialog (DECISIONS §13).
// Server component (the badge itself is a client component).

export function AppPromo({ locale, className }: { locale: Locale; className?: string }) {
  const s = ideasStrings[locale];
  return (
    <Card as="aside" className={className} aria-label={s.promoEyebrow}>
      <div className="ia-app-promo">
        <AppMark size={56} />
        <div className="ia-app-promo__text">
          <Eyebrow>{s.promoEyebrow}</Eyebrow>
          <p className="ia-app-promo__title">{s.promoTitle}</p>
          <p className="ia-app-promo__body">{s.promoBody}</p>
        </div>
        <AppStoreBadge />
      </div>
    </Card>
  );
}
