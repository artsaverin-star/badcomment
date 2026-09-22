import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getManifest, getOnboarding, type Art } from "@/site/content";
import { mediaSrc, mediaSrcSet } from "@/site/content/media";
import { landingStrings } from "@/site/features/landing/strings";
import { pageMetadata } from "@/site/features/legal/meta";
import { PLUS_UI_KEYS, plusOfferData } from "@/site/features/plus/server";
import { plusStrings } from "@/site/features/plus/strings";
import { WELCOME_UI_KEYS } from "@/site/features/welcome/keys";
import { WelcomeFlow, type WelcomeData, type WelcomeImage, type WelcomeLabels } from "@/site/features/welcome/WelcomeFlow";
import { I18nProvider } from "@/site/i18n/client";
import { isLocale } from "@/site/i18n/locales";
import { getT } from "@/site/i18n/server";
import { routes } from "@/site/routing";

// «Знакомство с приложением» (spec 03 §1, spec 09 §2.6): the 4 onboarding story pages from
// content/v2/<L>/onboarding.json (public fragments — the app shows them to everyone) + page 5,
// the paywall itself (as in the app's onboarding). Full screen: the shell hides its chrome on
// /welcome. noindex (spec 09 G9).

type Params = { lang: string };

function image(art: Art | undefined | null, width: number): WelcomeImage | null {
  return art ? { src: mediaSrc(art, width), srcSet: mediaSrcSet(art) } : null;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = await getT(lang);
  return pageMetadata({
    locale: lang,
    path: (l) => routes.welcome(l),
    title: t("Знакомство с приложением"),
    description: t("Изучили отзывы о 4 623 приложениях: что раздражает людей и чего им не хватает."),
    index: false,
  });
}

export default async function WelcomePage({ params }: { params: Promise<Params> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const [t, manifest, onboarding] = await Promise.all([getT(lang), getManifest(), getOnboarding(lang)]);

  const data: WelcomeData = {
    art: {
      reviews: image(manifest.art.WelcomeReviews_v7, 800),
      library: image(manifest.art.WelcomeLibrary_v7, 800),
    },
    articles: onboarding.articles.map((a) => ({
      key: `${a.category}:${a.observationId}`,
      label: a.label,
      title: a.observationTitle,
      excerpt: a.excerpt,
      image: image(a.art, 240),
      quote: a.quote ? { text: a.quote.excerpt, rating: a.quote.rating } : null,
    })),
    ideas: onboarding.ideas.map((i) => ({
      slug: i.slug,
      title: i.title,
      description: i.description,
      image: image(i.cover, 480),
    })),
    offer: plusOfferData(lang),
  };
  const ls = landingStrings[lang];
  const labels: WelcomeLabels = { pause: ls.carouselPause, play: ls.carouselPlay, rating: ls.ratingLabel };

  return (
    <I18nProvider
      locale={lang}
      strings={t.pick([...WELCOME_UI_KEYS, ...PLUS_UI_KEYS])}
      web={{ plus: plusStrings[lang] }}
    >
      <WelcomeFlow data={data} labels={labels} />
    </I18nProvider>
  );
}
