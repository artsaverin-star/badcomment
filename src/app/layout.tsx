import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Inter, Nunito } from "next/font/google";
import "@saverin/tokens/css";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MobileTabBar from "@/components/MobileTabBar";
import { getLocale } from "@/lib/i18n.server";
import { t } from "@/lib/i18n";

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
  const tr = t(locale);
  return (
    <html
      lang={locale}
      data-theme={theme}
      data-brand="saverin"
      className={`${inter.variable} ${nunito.variable} h-full antialiased`}
    >
      {/* pb on phones clears the fixed bottom tab bar */}
      <body className="flex min-h-full flex-col pb-24 sm:pb-0">
        <Header locale={locale} theme={theme} />
        {children}
        <Footer />
        <MobileTabBar
          catalogLabel={tr.nav.catalog}
          ideasLabel={tr.nav.ideas}
          searchLabel={locale === "en" ? "Search" : "Поиск"}
        />
      </body>
    </html>
  );
}
