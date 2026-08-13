import type { Metadata } from "next";
import { cookies } from "next/headers";
import Script from "next/script";
import localFont from "next/font/local";
import "@saverin/tokens/css";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTracker from "@/components/PageTracker";
import FavSync from "@/components/FavSync";
import { getLocale } from "@/lib/i18n.server";
import { getAccess } from "@/lib/access";

// Self-host the already-vendored Inter subsets so production builds never
// depend on Google Fonts being reachable. Separate families form a glyph
// fallback chain in globals.css: Latin first, then Cyrillic.
const interLatin = localFont({
  variable: "--font-inter-latin",
  src: [
    { path: "../../public/og-fonts/inter-latin-500-normal.woff", weight: "500", style: "normal" },
    { path: "../../public/og-fonts/inter-latin-800-normal.woff", weight: "800", style: "normal" },
  ],
  display: "swap",
});
const interCyrillic = localFont({
  variable: "--font-inter-cyrillic",
  src: [
    { path: "../../public/og-fonts/inter-cyrillic-500-normal.woff", weight: "500", style: "normal" },
    { path: "../../public/og-fonts/inter-cyrillic-800-normal.woff", weight: "800", style: "normal" },
  ],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://inapp.pro"),
  title: "inApp — reviews from popular apps, with conclusions",
  description:
    "An aggregator of app-store reviews with conclusions. Find the gaps worth building.",
  alternates: {
    types: { "application/rss+xml": "https://inapp.pro/feed.xml" },
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  // The DS ships light as :root and dark under [data-theme="dark"]; default to
  // light and let the header's ThemeSwitch flip the cookie to dark on request.
  const theme = (await cookies()).get("theme")?.value === "light" ? "light" : "dark";
  // Show the launch-price badge (LaunchOffer) to everyone who doesn't already
  // own everything (lifetime / admin / friend).
  const access = await getAccess();
  return (
    <html
      lang={locale}
      data-theme={theme}
      data-brand="saverin"
      className={`${interLatin.variable} ${interCyrillic.variable} h-full antialiased`}
    >
      <body className="flex min-h-[100dvh] flex-col">
        <div className="atmosphere" aria-hidden />
        {/* Brand entity for search + LLM grounding (Organization + WebSite). */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Organization",
                  "@id": "https://inapp.pro/#org",
                  name: "inApp",
                  alternateName: "inApp.pro",
                  logo: "https://inapp.pro/api/og?logo=1",
                  image: "https://inapp.pro/api/og?logo=1",
                  sameAs: ["https://telegram.me/inAppProBot"],
                  url: "https://inapp.pro",
                  description:
                    locale === "en"
                      ? "inApp reads thousands of App Store and Google Play reviews and turns them into market research for app builders: what users love and hate, which apps are missing, and which ideas are worth building."
                      : "inApp читает тысячи отзывов из App Store и Google Play и превращает их в рыночное исследование для тех, кто делает приложения.",
                },
                {
                  "@type": "WebSite",
                  "@id": "https://inapp.pro/#website",
                  url: "https://inapp.pro",
                  name: "inApp",
                  inLanguage: locale === "en" ? "en" : "ru",
                  publisher: { "@id": "https://inapp.pro/#org" },
                  potentialAction: {
                    "@type": "SearchAction",
                    target: { "@type": "EntryPoint", urlTemplate: `https://inapp.pro/${locale}/search?q={search_term_string}` },
                    "query-input": "required name=search_term_string",
                  },
                },
              ],
            }),
          }}
        />
        <Header locale={locale} loggedIn={access.loggedIn} showOffer={!access.unlimited} theme={theme} />
        <PageTracker />
        <FavSync enabled={access.loggedIn} />
        {children}
        <Footer locale={locale} />
        {/* DataFast privacy-friendly analytics */}
        <Script
          defer
          data-website-id="dfid_PVKv8dyF6ckAxf79RiAsf"
          data-domain="inapp.pro"
          src="https://datafa.st/js/script.js"
          strategy="afterInteractive"
        />
        {/* Google Analytics (gtag.js) */}
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-G3J6K8VBD6" strategy="afterInteractive" />
        <Script id="ga-gtag" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-G3J6K8VBD6');`}
        </Script>
        {/* Yandex.Metrika (id 110047715) */}
        <Script id="ym-metrika" strategy="afterInteractive">
          {`(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window,document,"script","https://mc.yandex.ru/metrika/tag.js?id=110047715","ym");
ym(110047715,'init',{ssr:true,webvisor:true,clickmap:true,ecommerce:"dataLayer",accurateTrackBounce:true,trackLinks:true});`}
        </Script>
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
