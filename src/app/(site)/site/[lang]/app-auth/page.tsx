import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { appAuthRedirectUrl, mintAppLoginCode } from "@/lib/appAuth";
import { APP_PKCE_COOKIE, normalizeCodeChallenge } from "@/lib/appFlow";
import { getSessionUser } from "@/lib/session";
import { APP_AUTH_FROM_EMAIL, appLoginPath } from "@/site/features/auth/app";
import { AppReturnScreen } from "@/site/features/auth/AppReturnScreen";
import { authStrings } from "@/site/features/auth/strings";
import { isLocale } from "@/site/i18n/locales";

// /<L>/app-auth — the website → iOS app sign-in hand-off (docs/site-v2/APP-ACCOUNTS.md).
// Reached inside the app's ASWebAuthenticationSession after signing in on /<L>/login?app=1
// (or straight from /api/app/auth/handoff/start when a web session already exists):
//   • guest → /<L>/login?app=1&return_to=/<L>/app-auth;
//   • signed in → a fresh one-time code (5 min, single use) → server-side 307 to
//     inapp://auth?code=…, which the sheet hands to the app;
//   • ?from=email (the e-mail link opened in Safari / a mail app, outside the sheet) → a
//     screen that opens the app itself and keeps «Открыть приложение» as a fallback.
// The code is bound to the PKCE challenge of the ia_app_pkce cookie (set by handoff/start, or by
// the e-mail verify route; src/lib/appFlow.ts) — never to one from this page's own URL.
// Only the session user is needed (getSessionUser: no RevenueCat wait of getViewer()).
// Never cached (a new code per request) and never indexed (metadata + the proxy's X-Robots-Tag).

export const dynamic = "force-dynamic";

type Params = { lang: string };
type Search = { from?: string | string[] };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return {
    title: authStrings[lang].returnPageTitle,
    robots: { index: false, follow: false },
  };
}

export default async function AppAuthPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Search>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const from = (await searchParams).from;
  const fromEmail = (Array.isArray(from) ? from[0] : from) === APP_AUTH_FROM_EMAIL;

  const user = await getSessionUser();
  if (!user) redirect(appLoginPath(lang));

  const challenge = normalizeCodeChallenge((await cookies()).get(APP_PKCE_COOKIE)?.value);
  const url = appAuthRedirectUrl(await mintAppLoginCode(user.id, { challenge }));
  if (!fromEmail) redirect(url);

  const s = authStrings[lang];
  return (
    <div className="ia-page ia-page--welcome ia-app-flow">
      <AppReturnScreen
        href={url}
        strings={{ returnTitle: s.returnTitle, returnBody: s.returnBody, returnOpen: s.returnOpen, returnFine: s.returnFine }}
      />
    </div>
  );
}
