import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@saverin/tokens/css";
import "./globals.css";
import Header from "@/components/Header";
import { getLocale } from "@/lib/i18n";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
      data-theme="light"
      data-brand="saverin"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Header locale={locale} />
        {children}
      </body>
    </html>
  );
}
