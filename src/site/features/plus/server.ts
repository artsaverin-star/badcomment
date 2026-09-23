import "server-only";
import type { Locale } from "../../i18n/locales";
import { format, pluralCategory, type T } from "../../i18n/translate";
import { FREE_CATEGORY, LAUNCH_CATEGORIES, LAUNCH_IDEAS } from "../../manifest.generated";
import { routes } from "../../routing";
import { AUTH_UI_KEYS } from "../auth/keys";
import { formatRub, PLUS_PRICE_RUB, type PlusOfferData, type PlusSheetPayload } from "./offer";
import { plusStrings } from "./strings";

/** App UI keys (content/v2/<L>/ui.json) the paywall and the return page render on the client. */
export const PLUS_UI_KEYS = [
  "Полный доступ",
  "Доступ открыт",
  "Все разборы и идеи, новые выпуски и экспорт материалов.",
  "Навсегда",
  "Полный доступ активен",
  "Остаться с бесплатным разбором",
  "Открыть библиотеку",
  "%1$@ один раз",
  "Купить навсегда",
  "Условия использования",
  "Конфиденциальность",
  "Закрыть",
  "Назад",
  "Отмена",
  "Сохранённое",
] as const;

/**
 * Keys the global hosts render before anything is fetched (every page carries them): the
 * sheet names and «Закрыть», plus everything the sign-in panel shows. The paywall's own keys
 * arrive with its offer (plusSheetPayload), so pages without buy UI carry no buy labels.
 */
export const HOST_UI_KEYS = [...AUTH_UI_KEYS, "Полный доступ"] as const;

/** "35 разборов" from word forms "one|few|many|other" (Japanese: no space, one form). */
function counted(locale: Locale, n: number, forms: string): string {
  const list = forms.split("|");
  const word = list[{ one: 0, few: 1, many: 2, other: 3 }[pluralCategory(locale, n)]] ?? list[list.length - 1];
  return locale === "ja" ? `${n}${word}` : `${n} ${word}`;
}

/** Localized offer facts for the paywall (price from ACCESS_PRICE_RUB). */
export function plusOfferData(locale: Locale): PlusOfferData {
  const s = plusStrings[locale];
  return {
    priceRub: PLUS_PRICE_RUB,
    priceLabel: formatRub(locale, PLUS_PRICE_RUB),
    scopeLabel: format(s.planScope, {
      topics: counted(locale, LAUNCH_CATEGORIES.length, s.topicsWord),
      ideas: counted(locale, LAUNCH_IDEAS.length, s.ideasWord),
    }),
    freeTopicHref: routes.topic(locale, FREE_CATEGORY),
  };
}

/** What the global paywall sheet fetches on its first open (GET /api/site/plus/offer). */
export function plusSheetPayload(locale: Locale, t: T): PlusSheetPayload {
  return { offer: plusOfferData(locale), strings: plusStrings[locale], ui: t.pick(PLUS_UI_KEYS) };
}
