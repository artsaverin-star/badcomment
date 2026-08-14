import type { Locale } from "./i18n";

// Legacy research data stores a three-state authenticity classifier under terse
// internal labels. Public copy must describe what the classifier actually
// measures: disagreement between the storefront star and review text. It is a
// screening signal, never proof that reviews were manipulated.
export function neutralizeTrustLanguage(value: string, locale: Locale): string {
  if (!value) return value;
  if (locale === "en") {
    return value
      .replace(/propped up by fake ratings/gi, "showing a large mismatch between the storefront star and review text")
      .replace(/(?:gamed|inflated|juiced|fake) (?:store )?(?:star|stars|rating|ratings|reviews)/gi, "a storefront star that diverges from review text")
      .replace(/reviews are (?:gamed|inflated|juiced|fake)/gi, "the storefront star diverges from review text")
      .replace(/(?:gaming|gamed) share/gi, "large-mismatch share");
  }
  return value
    .replace(/помечены как «Накручен» или «Сомнительный»/gi, "показывают сильное или умеренное расхождение витринной звезды с отзывами")
    .replace(/(\d+\s+из\s+\d+\s+приложени(?:й|я|е))\s+накручены/gi, "$1 дают сильное расхождение витринной звезды с отзывами")
    .replace(/с накрученными рейтингами/gi, "с рейтингами, сильно расходящимися с текстами отзывов")
    .replace(/накрученн(?:ая|ой|ую) звезд(?:а|ой|у)/gi, "витринная звезда, сильно расходящаяся с отзывами")
    .replace(/накрутки почти нет/gi, "сильных расхождений витринной звезды с отзывами почти нет")
    .replace(/накрут(?:ка|ки|кой|ку)/gi, "расхождение витринной звезды с отзывами");
}
