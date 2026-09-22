import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { SITE_URL } from "@/site/config";
import { CheckoutReturn } from "@/site/features/plus/CheckoutReturn";
import { PLUS_UI_KEYS } from "@/site/features/plus/server";
import { plusStrings } from "@/site/features/plus/strings";
import { I18nProvider } from "@/site/i18n/client";
import { isLocale, LOCALES, type Locale } from "@/site/i18n/locales";
import { getT } from "@/site/i18n/server";
import { routes } from "@/site/routing";

// /<L>/library?checkout=<uuid>: the YooKassa return page (spec 06 §4.2, the pay route's
// return_url is /library?checkout=…). It confirms the payment against our own server state
// and only then counts the purchase (scripts/test-monetization.ts). Without ?checkout the
// old "library" meaning is gone: → «Сохранённое». noindex (spec 09 §2.1).

type Params = { lang: string };
type Search = { checkout?: string | string[] };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const s = plusStrings[lang];
  const url = (l: Locale) => `${SITE_URL}${routes.library(l)}`;
  return {
    title: s.returnTitle,
    description: s.returnDescription,
    alternates: {
      canonical: url(lang),
      languages: { ...Object.fromEntries(LOCALES.map((l) => [l, url(l)])), "x-default": url("en") },
    },
    robots: { index: false, follow: false },
  };
}

export default async function LibraryPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Search>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const sp = await searchParams;
  const checkout = (Array.isArray(sp.checkout) ? sp.checkout[0] : sp.checkout)?.trim() ?? "";
  if (!checkout) redirect(routes.saved(lang));
  const t = await getT(lang);

  return (
    <div className="ia-page ia-page--welcome">
      <I18nProvider locale={lang} strings={t.pick(PLUS_UI_KEYS)}>
        <CheckoutReturn checkout={checkout.slice(0, 64)} />
      </I18nProvider>
    </div>
  );
}
