import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SITE_URL } from "@/site/config";
import { PlusOffer } from "@/site/features/plus/PlusOffer";
import { PLUS_UI_KEYS, plusOfferData } from "@/site/features/plus/server";
import { plusStrings } from "@/site/features/plus/strings";
import { I18nProvider } from "@/site/i18n/client";
import { isLocale, LOCALES, type Locale } from "@/site/i18n/locales";
import { getT } from "@/site/i18n/server";
import { routes } from "@/site/routing";

// /<L>/plus (?source=): the Plus paywall as a page (spec 03 §2, web adaptation §2.7;
// spec 09 §2.1: page on direct load, noindex). The same UI opens as a sheet anywhere via
// openPaywall(). The web sells only the YooKassa lifetime SKU at ACCESS_PRICE_RUB, presented
// as «Plus навсегда» (DECISIONS §10); the viewer state comes from the shell's ViewerContext.

type Params = { lang: string };
type Search = { source?: string | string[] };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const url = (l: Locale) => `${SITE_URL}${routes.plus(l)}`;
  return {
    title: { absolute: "inApp Plus" },
    description: plusStrings[lang].pageDescription,
    alternates: {
      canonical: url(lang),
      languages: { ...Object.fromEntries(LOCALES.map((l) => [l, url(l)])), "x-default": url("en") },
    },
    robots: { index: false, follow: true },
  };
}

export default async function PlusPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Search>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const [sp, t] = await Promise.all([searchParams, getT(lang)]);
  const rawSource = Array.isArray(sp.source) ? sp.source[0] : sp.source;
  const source = rawSource && /^[a-zA-Z0-9_.:-]{1,60}$/.test(rawSource) ? rawSource : "plus_page";

  return (
    <div className="ia-page ia-page--welcome">
      <I18nProvider locale={lang} strings={t.pick(PLUS_UI_KEYS)}>
        <PlusOffer offer={plusOfferData(lang, t)} source={source} variant="page" />
      </I18nProvider>
    </div>
  );
}
