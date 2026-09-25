import { counted } from "@/site/i18n/count";
import type { Locale } from "@/site/i18n/locales";
import { format } from "@/site/i18n/strings";
import type { T } from "@/site/i18n/translate";
import { routes } from "@/site/routing";
import { Card } from "@/site/ui/Card";
import { InfoIcon } from "@/site/ui/icons";
import { ROW_GLYPH, RowCard } from "@/site/ui/Row";
import { reviewsStrings } from "../reviews/strings";
import { ratingStrings } from "./strings";

// «Об оценках» on the niche page (spec 11 §4.2.9, D12): the app's method sheet
// (ClarityRatingMethodView, ClarityRatings.swift:444-472) as a visible section at the bottom of
// the page, word for word — what the two numbers are, the niche's count line and the honesty
// sentence — plus a row to the review methodology. Server. The niche list's legend links here
// (#rating-method).
//
//   <RatingMethod locale={L} t={t} niche={niche} />

/** «В архивной выборке этой темы: …» (ru needs the web plural forms, W3). */
function methodNote(locale: Locale, t: T, niche: { count: number; totalReviews: number }): string {
  const s = ratingStrings[locale];
  if (locale === "ru") {
    return format(s.methodCounts, {
      apps: counted("ru", niche.count, s.appsWord),
      reviews: counted("ru", niche.totalReviews, s.methodReviewsWord),
    });
  }
  return t(
    "В архивной выборке этой темы: %1$@ приложений и %2$@ прочитанных отзывов. Это общий объём исследования, не число отзывов у каждого приложения.",
    [t.number(niche.count), t.number(niche.totalReviews)],
  );
}

export function RatingMethod({
  locale,
  t,
  niche,
}: {
  locale: Locale;
  t: T;
  niche: { count: number; totalReviews: number };
}) {
  const rs = reviewsStrings[locale];
  return (
    <section id="rating-method" className="ia-rt-method" aria-labelledby="rating-method-title">
      <h2 id="rating-method-title" className="ia-section-title ia-section-title--bold">
        {t("Об оценках")}
      </h2>
      <h3 className="ia-subheading">{t("Две оценки — два источника")}</h3>
      <p className="ia-search-status">{t("Они помогают сравнивать приложения, но не заменяют проверку своей задачи.")}</p>
      <Card className="ia-rt-method-card">
        <h3 className="ia-subheading">{t("Оценка отзывов · до 100")}</h3>
        <p>
          {t(
            "Сохранённый балл из исследования inApp по текстам отзывов. Это общая оценка приложения в архиве, а не балл надёжности конкретной функции.",
          )}
        </p>
      </Card>
      <Card className="ia-rt-method-card">
        <h3 className="ia-subheading">{t("Оценка магазина · до 5")}</h3>
        <p>{t("Оценка со страницы приложения на момент сбора данных. Текущая оценка и версия могут отличаться.")}</p>
      </Card>
      <p className="ia-search-status">{methodNote(locale, t, niche)}</p>
      <p className="ia-search-status">
        {t(
          "Разница между оценками не доказывает накрутку. Дата расчёта и полная методика балла не включены в мобильный архив. Сравнивай описания задач и исходные цитаты, а условия проверяй в текущей версии.",
        )}
      </p>
      <RowCard
        href={routes.reviewsMethodology(locale)}
        glyph={<InfoIcon {...ROW_GLYPH} />}
        title={rs.methodology}
        subtitle={rs.methodologyBody}
      />
    </section>
  );
}
