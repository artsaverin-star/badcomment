import type { Locale } from "@/site/i18n/locales";
import { routes } from "@/site/routing";
import { PulseBarRows } from "./PulseGauge";
import type { PulseStrings } from "./strings";
import type { PulseNeed } from "./types";

// «Ещё в категории» on a need page: the same bar rows as «Пульс категории» (title, a bar of
// score × 10 %, «7/10»), each a link to the need. Pure and server-rendered.

export function PulseRows({ needs, locale, strings }: { needs: readonly PulseNeed[]; locale: Locale; strings: PulseStrings }) {
  return <PulseBarRows needs={needs} locale={locale} strings={strings} href={(id) => routes.pulseNeed(locale, id)} />;
}
