import "server-only";
import { INTL_LOCALE, type Locale } from "../../i18n/locales";
import { format } from "../../i18n/strings";
import type { T } from "../../i18n/translate";
import { FREE_CATEGORY, LAUNCH_CATEGORIES, LAUNCH_IDEAS } from "../../manifest.generated";
import { routes } from "../../routing";
import { formatRub, PLUS_PRICE_RUB, type PlusOfferData } from "./offer";
import { plusStrings, type PlusStrings } from "./strings";

/** App UI keys (content/v2/<L>/ui.json) the paywall and the return page render on the client. */
export const PLUS_UI_KEYS = [
  "Полный доступ",
  "Доступ открыт",
  "Все разборы и идеи, новые выпуски и экспорт материалов.",
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

function topicsLabel(s: PlusStrings, locale: Locale, n: number): string {
  const form = new Intl.PluralRules(INTL_LOCALE[locale]).select(n);
  const template =
    form === "one" ? s.topicsOne : form === "few" ? s.topicsFew : form === "many" ? s.topicsMany : s.topicsOther;
  return format(template, { n: new Intl.NumberFormat(INTL_LOCALE[locale]).format(n) });
}

/** Localized offer facts for the paywall (price from ACCESS_PRICE_RUB; counts from the manifest). */
export function plusOfferData(locale: Locale, t: T): PlusOfferData {
  const s = plusStrings[locale];
  return {
    priceRub: PLUS_PRICE_RUB,
    priceLabel: formatRub(locale, PLUS_PRICE_RUB),
    benefits: [
      format(s.benefitTopics, { topics: topicsLabel(s, locale, LAUNCH_CATEGORIES.length) }),
      format(s.benefitIdeas, { ideas: t.count("идея", LAUNCH_IDEAS.length) }),
      s.benefitExport,
      s.benefitUpdates,
    ],
    freeTopicHref: routes.topic(locale, FREE_CATEGORY),
  };
}
