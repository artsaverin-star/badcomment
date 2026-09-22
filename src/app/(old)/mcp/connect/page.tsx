import { redirect } from "next/navigation";
import { getLocale } from "@/lib/i18n.server";
import { getSessionUser } from "@/lib/session";
import ConnectClient from "./ConnectClient";

// The sign-in bridge of the MCP OAuth flow. The authorize endpoint sends
// signed-out browsers here with the original query packed into ?o=…; once the
// user signs in they bounce straight back and see the consent card.

export const dynamic = "force-dynamic";

export default async function McpConnectPage({ searchParams }: { searchParams: Promise<{ o?: string }> }) {
  const { o } = await searchParams;
  const locale = await getLocale();
  if (!o) redirect(`/${locale === "en" ? "en" : "ru"}/mcp`);

  let query = "";
  try {
    query = Buffer.from(o, "base64url").toString();
  } catch {
    redirect(`/${locale === "en" ? "en" : "ru"}/mcp`);
  }
  const authorizeUrl = `/api/mcp/oauth/authorize${query.startsWith("?") ? query : `?${query}`}`;

  const user = await getSessionUser();
  if (user) redirect(authorizeUrl);

  return <ConnectClient authorizeUrl={authorizeUrl} locale={locale} />;
}
