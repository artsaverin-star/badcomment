import type { Metadata } from "next";
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
  title: "badcomment — what people hate about popular apps",
  description:
    "Negative reviews from Google Play and the App Store, merged and themed. Find the gaps worth building.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  return (
    <html
      lang={locale}
      data-theme="dark"
      data-brand="saverin"
      className={`${nunito.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Header locale={locale} />
        {children}
      </body>
    </html>
  );
}
