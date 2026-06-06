import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Nunito } from "next/font/google";
import "@saverin/tokens/css";
import "./globals.css";
import Header from "@/components/Header";
import { getLocale } from "@/lib/i18n.server";

// The @saverin design system's brand font is "SF Compact Rounded" (Apple-only,
// not distributable on the web). Nunito is the closest free rounded face and is
// wired in as the cross-platform fallback (see --brand-font-family in
// globals.css). Cyrillic subset is required for the Russian UI.
const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin", "cyrillic"],
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
  return (
    <html
      lang={locale}
      data-theme={theme}
      data-brand="saverin"
      className={`${nunito.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Header locale={locale} theme={theme} />
        {children}
      </body>
    </html>
  );
}
