import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BackLink from "@/components/BackLink";
import NicheAppList from "@/components/NicheAppList";
import ReviewAccessGate from "@/components/ReviewAccessGate";
import { getAccess } from "@/lib/access";
import { getLocale } from "@/lib/i18n.server";
import { canAccessReviewCategory } from "@/lib/reviewAccess";
import { getNiche, listSourceApps, nicheName } from "@/lib/reviews";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const niche = getNiche(slug);
  if (!niche) return {};
  const locale = await getLocale();
  const ru = locale !== "en";
  const name = nicheName(niche, locale);
  const reviews = niche.sourceReviews || niche.apps.reduce((sum, app) => sum + app.total, 0);
  const title = ru ? `Отзывы: ${name} — inApp` : `Reviews: ${name} — inApp`;
  const description = ru
    ? `${reviews.toLocaleString("ru-RU")} размеченных отзывов о ${niche.appsPlanned} приложениях категории «${name}».`
    : `${reviews.toLocaleString("en-US")} labelled reviews across ${niche.appsPlanned} apps in the ${name} category.`;
  return {
    title,
    description,
    alternates: {
      canonical: `/reviews/${slug}`,
      languages: {
        ru: `https://inapp.pro/ru/reviews/${slug}`,
        en: `https://inapp.pro/en/reviews/${slug}`,
        "x-default": `https://inapp.pro/en/reviews/${slug}`,
      },
    },
    openGraph: { title, description, type: "website", siteName: "inApp" },
  };
}

export default async function NicheReviews({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const niche = getNiche(slug);
  if (!niche) notFound();
  const locale = await getLocale();
  const ru = locale !== "en";
  const lc = ru ? "ru-RU" : "en-US";
  const lp = ru ? "/ru" : "/en";
  const name = nicheName(niche, locale);
  const sourceReviews = niche.sourceReviews || niche.apps.reduce((sum, app) => sum + app.total, 0);
  const access = await getAccess();
  const unlocked = canAccessReviewCategory(access, slug);
  const detailedById = new Map(niche.apps.map((app) => [app.id, app]));
  const apps = listSourceApps(slug).map((app) => ({ ...app, icon: detailedById.get(app.id)?.icon }));
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: ru ? `Отзывы о приложениях категории «${name}»` : `Reviews of apps in the ${name} category`,
    description: ru ? `${sourceReviews} размеченных отзывов о ${apps.length} приложениях.` : `${sourceReviews} labelled reviews across ${apps.length} apps.`,
    url: `https://inapp.pro${lp}/reviews/${slug}`,
    isPartOf: { "@id": "https://inapp.pro/reviews#dataset" },
    variableMeasured: ["review text", "star rating", "topics"],
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <BackLink fallback={`${lp}/reviews`}>{ru ? "Категории" : "Categories"}</BackLink>
      <header className="mt-4">
        <h1 className="text-title1 text-balance text-[var(--color-text-primary)]">{name}</h1>
        <p className="mt-2 text-footnote tabular-nums text-[var(--color-text-tertiary)]">
          {apps.length.toLocaleString(lc)} {ru ? "приложений" : "apps"} · {sourceReviews.toLocaleString(lc)} {ru ? "отзывов" : "reviews"}
        </p>
      </header>

      {unlocked ? (
        <section className="mt-8" aria-labelledby="niche-apps-heading">
          <h2 id="niche-apps-heading" className="mb-4 text-title2 text-[var(--color-text-primary)]">{ru ? "Приложения" : "Apps"}</h2>
          <NicheAppList slug={slug} apps={apps} ru={ru} />
        </section>
      ) : (
        <ReviewAccessGate locale={locale} loggedIn={access.loggedIn} apps={apps.length} reviews={sourceReviews} />
      )}
    </main>
  );
}
