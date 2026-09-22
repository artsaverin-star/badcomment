import "server-only";
import type { Locale } from "../../i18n/locales";
import type { T } from "../../i18n/translate";
import { FREE_CATEGORY } from "../../manifest.generated";
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
  "Один платёж. Без продления.",
  "Полный доступ активен",
  "Остаться с бесплатным разбором",
  "Открыть библиотеку",
  "%1$@ один раз",
  "Пожизненный доступ. Без подписки.",
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

/** Localized offer facts for the paywall (price from ACCESS_PRICE_RUB). */
export function plusOfferData(locale: Locale): PlusOfferData {
  return {
    priceRub: PLUS_PRICE_RUB,
    priceLabel: formatRub(locale, PLUS_PRICE_RUB),
    freeTopicHref: routes.topic(locale, FREE_CATEGORY),
  };
}

/** What the global paywall sheet fetches on its first open (GET /api/site/plus/offer). */
export function plusSheetPayload(locale: Locale, t: T): PlusSheetPayload {
  return { offer: plusOfferData(locale), strings: plusStrings[locale], ui: t.pick(PLUS_UI_KEYS) };
}
