import type { Metadata } from "next";
import ReviewNicheCatalogue from "@/components/ReviewNicheCatalogue";
import { getLocale } from "@/lib/i18n.server";
import { listReviewCatalogue, totals } from "@/lib/reviews";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const ru = (await getLocale()) !== "en";
  const summary = totals();
  const title = ru ? "Отзывы по темам — inApp" : "Reviews by topic — inApp";
  const description = ru
    ? `${summary.sourceReviews.toLocaleString("ru-RU")} отзывов о ${summary.sourceApps.toLocaleString("ru-RU")} приложениях: категории, приложения, полные тексты и темы каждого отзыва.`
    : `${summary.sourceReviews.toLocaleString("en-US")} reviews across ${summary.sourceApps.toLocaleString("en-US")} apps: categories, apps, complete texts, and topics for every review.`;
  return {
    title,
    description,
    alternates: {
      canonical: "/reviews",
      languages: { ru: "https://inapp.pro/ru/reviews", en: "https://inapp.pro/en/reviews", "x-default": "https://inapp.pro/en/reviews" },
    },
    openGraph: { title, description, type: "website", siteName: "inApp" },
  };
}

export default async function ReviewsHome() {
  const locale = await getLocale();
  const ru = locale !== "en";
  const lc = ru ? "ru-RU" : "en-US";
  const lp = ru ? "/ru" : "/en";
  const niches = listReviewCatalogue(locale);
  const summary = totals();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    "@id": "https://inapp.pro/reviews#dataset",
    name: ru ? "Корпус отзывов о мобильных приложениях inApp" : "inApp mobile app review corpus",
    description: ru
      ? `${summary.sourceReviews} полных отзывов о ${summary.sourceApps} приложениях с поштучной многотемной разметкой.`
      : `${summary.sourceReviews} complete reviews across ${summary.sourceApps} apps with per-review multi-topic labels.`,
    url: `https://inapp.pro${lp}/reviews`,
    creator: { "@type": "Organization", name: "inApp", url: "https://inapp.pro" },
    variableMeasured: ["review text", "star rating", "topics"],
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <header>
        <h1 className="text-display font-bold text-[var(--color-text-primary)]">{ru ? "Отзывы" : "Reviews"}</h1>
        <p className="mt-3 max-w-[64ch] text-body text-pretty text-[var(--color-text-secondary)]">
          {ru
            ? "Выберите категорию, затем приложение. Внутри — полный список отзывов: оценка, исходный текст и все темы, которые прямо в нём упомянуты."
            : "Choose a category, then an app. Inside is the complete review list: rating, source text, and every topic directly mentioned in it."}
        </p>
        <p className="mt-4 text-footnote tabular-nums text-[var(--color-text-tertiary)]">
          {summary.sourceNiches.toLocaleString(lc)} {ru ? "категорий" : "categories"} · {summary.sourceApps.toLocaleString(lc)} {ru ? "приложения" : "apps"} · {summary.sourceReviews.toLocaleString(lc)} {ru ? "отзывов" : "reviews"}
        </p>
      </header>

      <ReviewNicheCatalogue niches={niches} ru={ru} lp={lp} />
    </main>
  );
}
