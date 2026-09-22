import { I18nProvider } from "../../i18n/client";
import type { Locale } from "../../i18n/locales";
import { getT } from "../../i18n/server";
import { SignInHost } from "../auth/SignInHost";
import { LibrarySync } from "../library/sync";
import { PaywallHost } from "./PaywallHost";
import { PLUS_UI_KEYS } from "./server";

// Global account hosts of the new site, mounted once by the root layout inside the shell
// (they need its ViewerContext): the sign-in dialog (openSignIn), the Plus paywall sheet
// (openPaywall; it fetches its price on first open, so no page carries it in its payload) and
// the saved/notes account sync of the library feature.

export async function AccountHosts({ locale }: { locale: Locale }) {
  const t = await getT(locale);
  return (
    <I18nProvider locale={locale} strings={t.pick(PLUS_UI_KEYS)}>
      <SignInHost />
      <PaywallHost />
      <LibrarySync />
    </I18nProvider>
  );
}
