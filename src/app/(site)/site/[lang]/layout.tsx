import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import Script from "next/script";
import "@/site/styles/site.css";
import { onest } from "@/site/fonts";
import { getViewer, summarizeViewer } from "@/site/access";
import { APP_STORE_APP_ID, APP_STORE_URL, SITE_URL } from "@/site/config";
import { SHELL_UI_KEYS } from "@/site/i18n/builtin";
import { I18nProvider } from "@/site/i18n/client";
import { isLocale } from "@/site/i18n/locales";
import { getT } from "@/site/i18n/server";
import { ChromeFrame } from "@/site/shell/ChromeFrame";
import { APP_BANNER_COOKIE } from "@/site/shell/constants";
import { Footer } from "@/site/shell/Footer";
import { THEME_COLOR, THEME_COOKIE, toTheme } from "@/site/theme";

// ROOT LAYOUT of the new site (internal /site/<L>/…, public /<L>/…; see src/proxy.ts).
// <html lang data-theme> from the ia_theme cookie (light by default; "system" is resolved
// in CSS), the --ia-* tokens, Onest, analytics, and the app chrome around every page.
// The old site has its own root layout (src/app/(old)/layout.tsx); crossing between them is
// a full document load, so no CSS or state leaks either way.

type Props = { children: ReactNode; params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Omit<Props, "children">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = await getT(lang);
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: "inApp", template: "%s — inApp" },
    description: t("Что людям важно в приложениях и чего им не хватает."),
    applicationName: "inApp",
    formatDetection: { telephone: false, email: false, address: false },
    // Safari's Smart App Banner only once the app is live (DECISIONS §13, spec 09 G2).
    ...(APP_STORE_URL ? { itunes: { appId: APP_STORE_APP_ID } } : {}),
  };
}

export async function generateViewport(): Promise<Viewport> {
  const theme = toTheme((await cookies()).get(THEME_COOKIE)?.value);
  return {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    colorScheme: theme === "system" ? "light dark" : theme,
    themeColor:
      theme === "system"
        ? [
            { media: "(prefers-color-scheme: light)", color: THEME_COLOR.light },
            { media: "(prefers-color-scheme: dark)", color: THEME_COLOR.dark },
          ]
        : THEME_COLOR[theme],
  };
}

export default async function SiteRootLayout({ children, params }: Props) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const jar = await cookies();
  const theme = toTheme(jar.get(THEME_COOKIE)?.value);
  const appBannerDismissed = jar.get(APP_BANNER_COOKIE)?.value === "hidden";
  const [t, viewer] = await Promise.all([getT(lang), getViewer()]);

  return (
    <html lang={lang} data-theme={theme} className={onest.variable} suppressHydrationWarning>
      <head>
        {/* Same counters and ordering contract as the old layout (scripts/test-monetization.ts):
            tiny queue shims first, then the remote loaders after hydration. The initial hit is
            NOT automatic (YM defer:true, GA send_page_view:false): RouteObserver sends every
            page view. `site: "v2"` tags every event of the new site (spec 09 §2.4). Native
            <script> on purpose: inline next/script from an async root layout did not execute. */}
        <script
          id="ym-metrika"
          dangerouslySetInnerHTML={{
            __html: `window.ym=window.ym||function(){(window.ym.a=window.ym.a||[]).push(arguments)};window.ym.l=1*new Date();
ym(110047715,'init',{ssr:true,defer:true,webvisor:true,clickmap:true,ecommerce:"dataLayer",accurateTrackBounce:true,trackLinks:true,params:{site:"v2"}});`,
          }}
        />
        <script
          id="ga-gtag"
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer=window.dataLayer||[];window.gtag=window.gtag||function(){window.dataLayer.push(arguments)};
gtag('js',new Date());gtag('set',{site:"v2"});gtag('config','G-G3J6K8VBD6',{send_page_view:false});`,
          }}
        />
      </head>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Organization",
                  "@id": `${SITE_URL}/#org`,
                  name: "inApp",
                  alternateName: "inApp.pro",
                  url: SITE_URL,
                  logo: `${SITE_URL}/api/og?logo=1`,
                },
                {
                  "@type": "WebSite",
                  "@id": `${SITE_URL}/#website`,
                  url: SITE_URL,
                  name: "inApp",
                  inLanguage: lang,
                  publisher: { "@id": `${SITE_URL}/#org` },
                  potentialAction: {
                    "@type": "SearchAction",
                    target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/${lang}/segment?q={search_term_string}` },
                    "query-input": "required name=search_term_string",
                  },
                },
              ],
            }),
          }}
        />
        <I18nProvider locale={lang} strings={t.pick(SHELL_UI_KEYS)}>
          <ChromeFrame
            viewer={summarizeViewer(viewer)}
            appBannerDismissed={appBannerDismissed}
            footer={<Footer locale={lang} />}
          >
            {children}
          </ChromeFrame>
        </I18nProvider>
        {/* DataFast privacy-friendly analytics */}
        <Script
          defer
          data-website-id="dfid_PVKv8dyF6ckAxf79RiAsf"
          data-domain="inapp.pro"
          src="https://datafa.st/js/script.js"
          strategy="afterInteractive"
        />
        {/* Remote analytics libraries load independently after hydration. */}
        <Script src="https://mc.yandex.ru/metrika/tag.js?id=110047715" strategy="afterInteractive" />
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-G3J6K8VBD6" strategy="afterInteractive" />
        <noscript>
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="https://mc.yandex.ru/watch/110047715" style={{ position: "absolute", left: "-9999px" }} alt="" />
          </div>
        </noscript>
      </body>
    </html>
  );
}
