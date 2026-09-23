import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { APP_PKCE_COOKIE, normalizeCodeChallenge } from "@/lib/appFlow";
import { getViewer } from "@/site/access";
import { SITE_URL } from "@/site/config";
import { appAuthPath, isAppMode } from "@/site/features/auth/app";
import { noticeFor } from "@/site/features/auth/copy";
import { AUTH_UI_KEYS } from "@/site/features/auth/keys";
import { LoginScreen } from "@/site/features/auth/LoginScreen";
import { authStrings } from "@/site/features/auth/strings";
import { accountShareMeta } from "@/site/features/plus/meta";
import { I18nProvider } from "@/site/i18n/client";
import { isLocale, LOCALES, type Locale } from "@/site/i18n/locales";
import { getT } from "@/site/i18n/server";
import { isSafeReturnPath, parsePublicPath, routes } from "@/site/routing";

// /<L>/login (?return_to=&reason=): the sign-in page (ARCHITECTURE §4, spec 06 §3.6).
// The same panel opens as a dialog anywhere via openSignIn(). Signed-in visitors go straight
// to return_to. noindex (spec 09 §2.1).
// App mode (?app=1): the iOS app's sign-in sheet (docs/site-v2/APP-ACCOUNTS.md). Same methods,
// the app's heading, no site chrome (auth.css hides it around .ia-app-flow) and the only
// destination is /<L>/app-auth, whatever return_to says. The app's PKCE challenge (cookie set by
// /api/app/auth/handoff/start) rides along in the e-mail link (src/lib/appFlow.ts).

type Params = { lang: string };
type Search = {
  return_to?: string | string[];
  reason?: string | string[];
  auth?: string | string[];
  login?: string | string[];
  app?: string | string[];
};

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Search>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const s = authStrings[lang];
  const app = isAppMode((await searchParams).app);
  const url = (l: Locale) => `${SITE_URL}${routes.login(l)}`;
  return {
    title: app ? s.appPageTitle : s.pageTitle,
    description: s.pageDescription,
    alternates: {
      canonical: url(lang),
      languages: { ...Object.fromEntries(LOCALES.map((l) => [l, url(l)])), "x-default": url("en") },
    },
    robots: { index: false, follow: true },
    ...accountShareMeta(lang, url(lang), s.title, s.pageDescription),
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
  const app = isAppMode(sp.app);
  const raw = one(sp.return_to);
  // Only a public path of this site, and never the login page itself (no loop). App mode
  // always hands off to the app (the sheet must not wander into the site).
  const returnTo = app
    ? appAuthPath(lang)
    : isSafeReturnPath(raw) && parsePublicPath(raw.split(/[?#]/)[0]).segments[0] !== "login"
      ? raw
      : routes.research(lang);

  const [t, viewer] = await Promise.all([getT(lang), getViewer()]);
  if (viewer.loggedIn) redirect(returnTo);

  const reason = one(sp.reason) ?? null;
  const notice = noticeFor(authStrings[lang], one(sp.auth), one(sp.login));
  const appChallenge = app ? normalizeCodeChallenge((await cookies()).get(APP_PKCE_COOKIE)?.value) : null;

  return (
    <div className={app ? "ia-page ia-page--welcome ia-app-flow" : "ia-page ia-page--welcome"}>
      <I18nProvider locale={lang} strings={t.pick(AUTH_UI_KEYS)} web={{ auth: authStrings[lang] }}>
        <LoginScreen returnTo={returnTo} reason={reason} notice={notice} app={app} appChallenge={appChallenge} />
      </I18nProvider>
    </div>
  );
}
