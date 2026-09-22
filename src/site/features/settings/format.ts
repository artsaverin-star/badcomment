import { INTL_LOCALE, type Locale } from "@/site/i18n/locales";

/**
 * «Сборник от %1$@»: the collection date (manifest.collectionDate, "2026-09-05") in the page
 * locale — "5 сентября 2026", "September 5, 2026", "2026年9月5日". The app always formats it in
 * Russian (spec 02 §11 #7); the web localizes it (spec 04 Manifest note).
 */
export function formatCollectionDate(isoDay: string, locale: Locale): string {
  const d = new Date(`${isoDay}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return isoDay;
  const s = new Intl.DateTimeFormat(INTL_LOCALE[locale], { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(d);
  return locale === "ru" ? s.replace(/\s?г\.$/, "") : s;
}
