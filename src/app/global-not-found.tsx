import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import "@/site/styles/site.css";
import { SITE_URL } from "@/site/config";
import { LOCALE_COOKIE, type Locale } from "@/site/i18n/locales";
import { notFoundLocale } from "@/site/routing/decide";
import { THEME_COOKIE, toTheme } from "@/site/theme";
import { buttonClass } from "@/site/ui/Button";
import { ClarityArt } from "@/site/ui/EmptyState";
import { AppMark, ArrowRightIcon, SearchIcon } from "@/site/ui/icons";

// The 404 for URLs that match no route at all (experimental.globalNotFound in next.config.ts).
// The app has two root layouts — the old site's src/app/(old)/layout.tsx and the new site's
// src/app/(site)/site/[lang]/layout.tsx — so there is no single layout to compose a 404 from:
// Next renders this file as the whole document instead. Typical visitors: multi-segment old
// URLs that no longer exist (/ru/foo/bar/baz, /ru/old/x/y/z; the proxy rewrote them to an old
// internal path) and paths the proxy never sees (/foo.php). notFound() inside a page still
// renders that page's own not-found boundary (the new site: [lang]/not-found.tsx).
//
// New design (the --ia-* tokens and components of src/site/styles/site.css), localized:
// the URL's locale from the proxy (x-ia-public-path), else the `locale` cookie, else
// Accept-Language (notFoundLocale in src/site/routing/decide.ts). Next adds robots noindex
// to 404 responses; metadataBase keeps the inherited og:image on inapp.pro in production.
// Tailwind does not scan this file (site.css @source), so layout is inline, not utilities.

const COPY: Record<Locale, { title: string; body: string; research: string; ideas: string; home: string }> = {
  ru: {
    title: "Страница не найдена",
    body: "Такой страницы нет или она переехала. Загляни в разборы или идеи.",
    research: "Разборы",
    ideas: "Идеи",
    home: "На главную",
  },
  en: {
    title: "Page not found",
    body: "This page doesn't exist or has moved. Have a look at the breakdowns or the ideas.",
    research: "Breakdowns",
    ideas: "Ideas",
    home: "Home",
  },
  de: {
    title: "Seite nicht gefunden",
    body: "Diese Seite gibt es nicht oder sie ist umgezogen. Schau dir die Analysen oder die Ideen an.",
    research: "Analysen",
    ideas: "Ideen",
    home: "Startseite",
  },
  fr: {
    title: "Page introuvable",
    body: "Cette page n'existe pas ou a été déplacée. Jette un œil aux décryptages ou aux idées.",
    research: "Décryptages",
    ideas: "Idées",
    home: "Accueil",
  },
  ja: {
    title: "ページが見つかりません",
    body: "このページは存在しないか、移動した可能性があります。分析やアイデアから探してみてください。",
    research: "分析",
    ideas: "アイデア",
    home: "ホーム",
  },
};

async function notFoundContext(): Promise<{ locale: Locale; theme: ReturnType<typeof toTheme> }> {
  const [h, jar] = await Promise.all([headers(), cookies()]);
  const locale = notFoundLocale({
    publicPath: h.get("x-ia-public-path"),
    cookie: jar.get(LOCALE_COOKIE)?.value ?? null,
    acceptLanguage: h.get("accept-language"),
  });
  return { locale, theme: toTheme(jar.get(THEME_COOKIE)?.value) };
}

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await notFoundContext();
  // No `robots` here: Next already emits <meta name="robots" content="noindex"> for every 404
  // (a second tag would only duplicate it).
  return { metadataBase: new URL(SITE_URL), title: `${COPY[locale].title} — inApp` };
}

export default async function GlobalNotFound() {
  const { locale, theme } = await notFoundContext();
  const s = COPY[locale];
  return (
    <html lang={locale} data-theme={theme}>
      <body>
        {/* Plain <a>: every target is a new-site page under another root layout. */}
        <main
          className="ia-page ia-page--catalog"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 24,
            minHeight: "100dvh",
            justifyContent: "center",
            textAlign: "center",
          }}
        >
          <a href={`/${locale}`} aria-label="inApp">
            <AppMark size={40} />
          </a>
          <ClarityArt size={150} icon={<SearchIcon size={22} strokeWidth={2} />} />
          <div className="ia-heading" style={{ alignItems: "center" }}>
            <p
              style={{
                margin: 0,
                font: "600 var(--ia-fs-footnote) / var(--ia-lh-footnote) var(--ia-font-sans)",
                letterSpacing: "0.08em",
                color: "var(--ia-secondary)",
              }}
            >
              404
            </p>
            <h1 className="ia-heading__title">{s.title}</h1>
            <p className="ia-heading__subtitle">{s.body}</p>
          </div>
          <nav style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 12 }}>
            <a href={`/${locale}/segment`} className={buttonClass({ variant: "rect" })}>
              {s.research}
              <ArrowRightIcon size={17} strokeWidth={2.2} aria-hidden="true" />
            </a>
            <a href={`/${locale}/ideas`} className={buttonClass({ variant: "secondary" })}>
              {s.ideas}
            </a>
          </nav>
          <a href={`/${locale}`} className={buttonClass({ variant: "text" })}>
            {s.home}
          </a>
        </main>
      </body>
    </html>
  );
}
