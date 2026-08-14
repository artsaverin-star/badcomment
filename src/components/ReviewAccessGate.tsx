import BuyButton from "@/components/BuyButton";
import Link from "next/link";
import type { Locale } from "@/lib/i18n";

export default function ReviewAccessGate({
  locale,
  loggedIn,
  apps,
  reviews,
}: {
  locale: Locale;
  loggedIn: boolean;
  apps: number;
  reviews: number;
}) {
  const ru = locale !== "en";
  const lp = ru ? "/ru" : "/en";
  const nf = (value: number) => value.toLocaleString(ru ? "ru-RU" : "en-US");
  const pluralRu = (value: number, one: string, few: string, many: string) => {
    const mod100 = value % 100;
    const mod10 = value % 10;
    if (mod100 >= 11 && mod100 <= 14) return many;
    if (mod10 === 1) return one;
    if (mod10 >= 2 && mod10 <= 4) return few;
    return many;
  };
  const appsLabel = ru ? pluralRu(apps, "приложение", "приложения", "приложений") : apps === 1 ? "app" : "apps";
  const reviewsLabel = ru ? pluralRu(reviews, "отзыв", "отзыва", "отзывов") : reviews === 1 ? "review" : "reviews";

  return (
    <section className="mt-8 overflow-hidden rounded-[22px] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card-subtle)] p-6 sm:p-8" aria-labelledby="review-access-heading">
      <div className="flex size-11 items-center justify-center rounded-full bg-[var(--color-bg-muted)] text-[var(--color-text-secondary)]" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <rect x="4" y="8.5" width="12" height="8.5" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M6.75 8.5V6.25a3.25 3.25 0 0 1 6.5 0V8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      <h2 id="review-access-heading" className="mt-5 text-title2 text-[var(--color-text-primary)]">
        {ru ? "Архив доступен после оплаты" : "The archive is included with paid access"}
      </h2>
      <p className="mt-3 max-w-[58ch] text-body text-pretty text-[var(--color-text-secondary)]">
        {ru
          ? `${nf(apps)} ${appsLabel} и ${nf(reviews)} ${reviewsLabel} останутся на месте: полный текст, оценка и темы каждого отзыва. Один платёж открывает весь архив и остальные разделы навсегда.`
          : `${nf(apps)} ${appsLabel} and ${nf(reviews)} ${reviewsLabel} stay right here: complete text, rating, and every topic on each review. One payment unlocks the full archive and the rest of the site forever.`}
      </p>
      <div className="mt-6">
        <BuyButton loggedIn={loggedIn} locale={locale} />
      </div>
      <p className="mt-4 text-caption text-[var(--color-text-tertiary)]">
        {ru ? "Сначала можно проверить качество на категории «Знакомства» — она открыта полностью." : "First, verify the quality in Dating — that category is completely open."}{" "}
        <Link href={`${lp}/reviews/dating-apps`} className="font-medium text-[var(--color-text-brand)] hover:underline">
          {ru ? "Открыть пример →" : "Open sample →"}
        </Link>
      </p>
    </section>
  );
}
