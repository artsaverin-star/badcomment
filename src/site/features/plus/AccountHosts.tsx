import { I18nProvider } from "../../i18n/client";
import type { Locale } from "../../i18n/locales";
import { getT } from "../../i18n/server";
import { SignInHost } from "../auth/SignInHost";
import { authStrings } from "../auth/strings";
import { LibrarySync } from "../library/sync";
import { PaywallHost } from "./PaywallHost";
import { HOST_UI_KEYS } from "./server";

// Global account hosts of the new site, mounted once by the root layout inside the shell
// (they need its ViewerContext): the sign-in sheet (openSignIn), the Plus paywall sheet
// (openPaywall) and the saved/notes account sync of the library feature.
// Payload discipline (performance review P2; DECISIONS «Legal pages»): every page carries only
// the page locale's sign-in strings and a handful of app keys. The panels' code loads on first
// open, and the paywall fetches its price, strings and buy labels then (/api/site/plus/offer),
// so no page without buy UI (landing, /offer, /contacts) has them in its HTML or RSC payload.

export async function AccountHosts({ locale }: { locale: Locale }) {
  const t = await getT(locale);
  return (
    <I18nProvider locale={locale} strings={t.pick(HOST_UI_KEYS)} web={{ auth: authStrings[locale] }}>
      <SignInHost />
      <PaywallHost />
      <LibrarySync />
    </I18nProvider>
  );
}
