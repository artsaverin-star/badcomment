import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getViewer } from "@/site/access";
import { getCatalog } from "@/site/content";
import { getLandingData } from "@/site/features/landing/data";
import { LandingPage } from "@/site/features/landing/LandingPage";
import { landingMetadata } from "@/site/features/landing/seo";
import { isLocale } from "@/site/i18n/locales";
import { FREE_CATEGORY } from "@/site/manifest.generated";
import { routes } from "@/site/routing";

// /<L> — the front door (DECISIONS §9, spec 09 §2.6): signed-out visitors (and crawlers) get
// the landing (spec 08); signed-in visitors go straight to the app home, the research catalog
// (307 /<L>/segment). The landing is also the App Store marketing URL: no website prices,
// payment methods or buy buttons (DECISIONS «Legal pages»).

type Params = { lang: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const catalog = await getCatalog(lang);
  const cover = catalog.categories.find((c) => c.slug === FREE_CATEGORY)?.cover ?? null;
  return landingMetadata(lang, cover);
}

export default async function HomePage({ params }: { params: Promise<Params> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const viewer = await getViewer();
  if (viewer.loggedIn) redirect(routes.research(lang));
  const data = await getLandingData(lang);
  return <LandingPage locale={lang} data={data} />;
}
