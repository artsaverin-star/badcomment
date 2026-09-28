import type { Locale } from "@/site/i18n/locales";
import { AppPromo } from "./AppPromo";

// The end of every topic page, readable or locked. The page is a copy of the app's article
// (owner, 2026-09-23: the «Приложения в этой теме» block with other apps was removed); the
// web adds the promo of our own iOS app. «Пульс категории» is not here: it sits right under the
// hero (owner, 2026-09-25), see CategoryPulse and the topic page. The link to the previous
// version of the breakdown went with the old site (2026-09-27).

export function TopicExtras({ locale }: { locale: Locale }) {
  return (
    <div className="ia-rs-extras">
      <AppPromo locale={locale} />
    </div>
  );
}
