import MarketPlayersList from "@/components/MarketPlayersList";
import type { Locale } from "@/lib/i18n";
import { marketPlayersFor } from "@/lib/marketPlayers.server";
import { getApp } from "@/lib/reviews";

export default function NicheMarketPlayers({ slug, locale }: { slug: string; locale: Locale }) {
  const snapshot = marketPlayersFor(slug);
  if (!snapshot) return null;

  // Only public store data and links cross the client boundary. The archive
  // keeps its own authorization; no private review text is loaded here.
  const apps = snapshot.apps.map((app) => ({
    ...app,
    reviewHref: getApp(slug, app.appStoreId) ? `/${locale}/reviews/${slug}/${app.appStoreId}` : undefined,
  }));
  return <MarketPlayersList key={slug} data={{ ...snapshot, apps }} locale={locale} />;
}
