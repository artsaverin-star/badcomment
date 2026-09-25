import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getViewer } from "@/site/access";
import { ConnectScreen } from "@/site/features/mcp/ConnectScreen";
import { mcpStrings } from "@/site/features/mcp/strings";
import { I18nProvider } from "@/site/i18n/client";
import { isLocale } from "@/site/i18n/locales";
import { getT } from "@/site/i18n/server";
import { routes } from "@/site/routing";
import { BackButton, DetailToolbar } from "@/site/ui";

// The sign-in bridge of the MCP OAuth flow. /api/mcp/oauth/authorize sends a signed-out browser
// here with its original query packed into ?o=<base64url>; a signed-in one goes straight back to
// the authorize endpoint (the consent screen), everyone else signs in first (ConnectScreen).
// Layout: the one 680 column of the section (R2), page stack gap 24 (spec §5 «/mcp/connect»),
// so the accent «Назад» pill lines up with the heading; only shared blocks, so no feature
// stylesheet.

type Props = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ o?: string | string[] }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return { title: mcpStrings[lang].connectTitle, robots: { index: false, follow: false } };
}

/** The authorize URL from ?o= (base64url of the original "?client_id=…&…"), or null. */
function authorizeUrl(o: string | undefined): string | null {
  if (!o || o.length > 4096 || !/^[A-Za-z0-9_-]+={0,2}$/.test(o)) return null;
  let query: string;
  try {
    query = Buffer.from(o, "base64url").toString("utf8");
  } catch {
    return null;
  }
  const q = query.startsWith("?") ? query.slice(1) : query;
  if (!q) return null;
  // Re-serialized onto the fixed endpoint path: whatever ?o= holds, the target stays a query of
  // /api/mcp/oauth/authorize on this origin (the endpoint validates the parameters itself).
  return `/api/mcp/oauth/authorize?${new URLSearchParams(q).toString()}`;
}

export default async function McpConnectPage({ params, searchParams }: Props) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const sp = await searchParams;
  const target = authorizeUrl(Array.isArray(sp.o) ? sp.o[0] : sp.o);
  if (!target) redirect(routes.mcp(lang));
  const [t, viewer] = await Promise.all([getT(lang), getViewer()]);
  if (viewer.loggedIn) redirect(target);

  return (
    <I18nProvider locale={lang} web={{ mcp: mcpStrings[lang] }}>
      <DetailToolbar
        leading={<BackButton className="ia-glass-pill--accent" label={t("Назад")} fallbackHref={routes.mcp(lang)} />}
      />
      <div className="ia-page ia-page--catalog ia-page--stack ia-page--stack-24">
        <ConnectScreen authorizeUrl={target} />
      </div>
    </I18nProvider>
  );
}
