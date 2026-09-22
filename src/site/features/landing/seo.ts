import type { Metadata } from "next";
import { APP_STORE_APP_ID, APP_STORE_URL, SITE_URL } from "@/site/config";
import { mediaAbsoluteUrl } from "@/site/content/media";
import type { Art } from "@/site/content/types";
import { LOCALES, type Locale } from "@/site/i18n/locales";
import { routes } from "@/site/routing";
import { fill } from "./parts";
import { FAQ_IDS, landingStrings, OG_LOCALE, type LandingStrings } from "./strings";

// SEO of the landing (spec 08 §5; 09 G9): title/description per locale with the brand at the
// end, self-canonical, hreflang for the 5 locales + x-default (en), OG/Twitter with the free
// topic's cover, index/follow + large image previews. JSON-LD: the layout already emits
// Organization + WebSite on every page; the landing adds WebPage, the iOS MobileApplication
// (App Store id, NO offers/price, installUrl only once the store link exists) and FAQPage.

const url = (l: Locale) => `${SITE_URL}${routes.home(l)}`;

export function landingMetadata(locale: Locale, ogImage: Art | null): Metadata {
  const s = landingStrings[locale];
  const images = ogImage
    ? [{ url: mediaAbsoluteUrl(ogImage, SITE_URL), width: ogImage.width, height: ogImage.height, alt: s.ogAlt }]
    : undefined;
  return {
    title: { absolute: s.metaTitle },
    description: s.metaDescription,
    alternates: {
      canonical: url(locale),
      languages: { ...Object.fromEntries(LOCALES.map((l) => [l, url(l)])), "x-default": url("en") },
    },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
    openGraph: {
      type: "website",
      siteName: "inApp",
      url: url(locale),
      title: s.metaTitle,
      description: s.metaDescription,
      locale: OG_LOCALE[locale],
      alternateLocale: LOCALES.filter((l) => l !== locale).map((l) => OG_LOCALE[l]),
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: s.metaTitle,
      description: s.metaDescription,
      images: images?.map((i) => i.url),
    },
  };
}

export type FaqVars = Record<string, string | number>;

export function faqEntries(s: LandingStrings, vars: FaqVars): { q: string; a: string }[] {
  return FAQ_IDS.map((i) => ({
    q: s[`faq${i}Q` as keyof LandingStrings],
    a: fill(s[`faq${i}A` as keyof LandingStrings], vars),
  }));
}

export function landingJsonLd(locale: Locale, faq: { q: string; a: string }[], iconUrl: string | null): string {
  const s = landingStrings[locale];
  const page = url(locale);
  const graph = [
    {
      "@type": "WebPage",
      "@id": `${page}#webpage`,
      url: page,
      name: s.metaTitle,
      description: s.metaDescription,
      inLanguage: locale,
      isPartOf: { "@id": `${SITE_URL}/#website` },
      about: { "@id": `${SITE_URL}/#ios-app` },
    },
    {
      "@type": "MobileApplication",
      "@id": `${SITE_URL}/#ios-app`,
      name: "inApp",
      operatingSystem: "iOS",
      description: s.metaDescription,
      inLanguage: [...LOCALES],
      url: page,
      identifier: APP_STORE_APP_ID,
      // The App Store page 404s until Apple approves the app (DECISIONS §13).
      ...(APP_STORE_URL ? { installUrl: APP_STORE_URL, downloadUrl: APP_STORE_URL, sameAs: APP_STORE_URL } : {}),
      ...(iconUrl ? { image: iconUrl } : {}),
      publisher: { "@id": `${SITE_URL}/#org` },
    },
    {
      "@type": "FAQPage",
      "@id": `${page}#faq`,
      inLanguage: locale,
      mainEntity: faq.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ];
  // "<" escaped so text can never close the <script> element.
  return JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replace(/</g, "\\u003c");
}
