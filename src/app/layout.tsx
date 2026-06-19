import type { Metadata } from "next";
import { cookies } from "next/headers";
import Script from "next/script";
import { Inter, Nunito } from "next/font/google";
import "@saverin/tokens/css";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getLocale } from "@/lib/i18n.server";

// Inter is the primary UI face — a crisp modern grotesque (getgems-like). It
// drives --brand-font-family (see globals.css). Nunito stays loaded as the
// rounded fallback variable for any brand override. Cyrillic subset for the RU UI.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});
const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://inapp.pro"),
  title: "inApp — reviews from popular apps, with conclusions",
  description:
    "An aggregator of app-store reviews with conclusions. Find the gaps worth building.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  // The DS ships light as :root and dark under [data-theme="dark"]; default to
  // dark (the established look) and let the header's ThemeSwitch flip the cookie.
  const theme = (await cookies()).get("theme")?.value === "light" ? "light" : "dark";
  return (
    <html
      lang={locale}
      data-theme={theme}
      data-brand="saverin"
      className={`${inter.variable} ${nunito.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
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
        <Header locale={locale} theme={theme} />
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
      </body>
    </html>
  );
}
