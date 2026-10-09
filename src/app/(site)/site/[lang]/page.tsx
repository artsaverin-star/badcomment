import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/site/i18n/locales";
import { routes } from "@/site/routing";

// The proxy permanently redirects public /<L> to the research catalog for every viewer.
// Keep the same destination here as a fallback for internal rendering.

type Params = { lang: string };

export default async function HomePage({ params }: { params: Promise<Params> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  redirect(routes.research(lang));
}
