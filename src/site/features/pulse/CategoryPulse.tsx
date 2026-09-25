import type { Locale } from "@/site/i18n/locales";
import { getPulseDemand } from "@/site/sitedata/pulse";
import { categoryNeeds } from "./query";
import { CategoryPulseView } from "./PulseRows";
import { pulseStrings } from "./strings";
import "./pain-meter.css";
import "./pulse.css";

/** «Пульс категории» at the end of a topic page (TopicExtras), readable or locked. */
export async function CategoryPulse({ locale, slug }: { locale: Locale; slug: string }) {
  const data = await getPulseDemand();
  return <CategoryPulseView categoryId={slug} needs={categoryNeeds(data, slug)} locale={locale} strings={pulseStrings[locale]} />;
}
