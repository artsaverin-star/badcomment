import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getViewer } from "@/site/access";
import { SITE_URL } from "@/site/config";
import { LoginScreen } from "@/site/features/auth/LoginScreen";
import { authStrings, noticeFor } from "@/site/features/auth/strings";
import { PLUS_UI_KEYS } from "@/site/features/plus/server";
import { I18nProvider } from "@/site/i18n/client";
import { isLocale, LOCALES, type Locale } from "@/site/i18n/locales";
import { getT } from "@/site/i18n/server";
import { isSafeReturnPath, parsePublicPath, routes } from "@/site/routing";

// /<L>/login (?return_to=&reason=): the sign-in page (ARCHITECTURE §4, spec 06 §3.6).
// The same panel opens as a dialog anywhere via openSignIn(). Signed-in visitors go straight
// to return_to. noindex (spec 09 §2.1).

type Params = { lang: string };
type Search = { return_to?: string | string[]; reason?: string | string[]; auth?: string | string[]; login?: string | string[] };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const s = authStrings[lang];
  const url = (l: Locale) => `${SITE_URL}${routes.login(l)}`;
  return {
    title: s.pageTitle,
    description: s.pageDescription,
    alternates: {
      canonical: url(lang),
      languages: { ...Object.fromEntries(LOCALES.map((l) => [l, url(l)])), "x-default": url("en") },
    },
    robots: { index: false, follow: true },
  };
}

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Search>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const sp = await searchParams;
  const raw = one(sp.return_to);
  // Only a public path of this site, and never the login page itself (no loop).
  const returnTo =
    isSafeReturnPath(raw) && parsePublicPath(raw.split(/[?#]/)[0]).segments[0] !== "login" ? raw : routes.research(lang);

  const [t, viewer] = await Promise.all([getT(lang), getViewer()]);
  if (viewer.loggedIn) redirect(returnTo);

  const reason = one(sp.reason) ?? null;
  const notice = noticeFor(authStrings[lang], one(sp.auth), one(sp.login));

  return (
    <div className="ia-page ia-page--welcome">
      <I18nProvider locale={lang} strings={t.pick(PLUS_UI_KEYS)}>
        <LoginScreen returnTo={returnTo} reason={reason} notice={notice} />
      </I18nProvider>
    </div>
  );
}
