import { isPremium } from "@/lib/premium";
import { getLocale } from "@/lib/i18n.server";
import { getCatalogData } from "@/lib/catalogData";
import CatalogBrowser from "@/components/CatalogBrowser";

export const dynamic = "force-dynamic";

export default async function CatalogPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const locale = await getLocale();
  const premium = await isPremium();
  const view = (await searchParams).view === "apps" ? "apps" : "cats";
  const { domains, catalogApps } = getCatalogData(locale, premium);
  const ru = locale !== "en";

  const title = view === "apps" ? (ru ? "Приложения" : "Apps") : ru ? "Категории" : "Categories";
  const desc =
    view === "apps"
      ? ru
        ? "Все приложения с готовым разбором отзывов — нажмите, чтобы открыть выводы."
        : "All apps with a ready review breakdown — tap to open the conclusions."
      : ru
        ? "Разборы отзывов по категориям приложений: что хвалят, на что злятся, какие проблемы повторяются."
        : "Review breakdowns by app category: what users love, hate, and which problems repeat.";

  return (
    <main className="mx-auto w-full max-w-6xl overflow-x-clip px-4 py-10">
      <h1 className="text-[28px] font-bold tracking-[-0.01em] text-[var(--color-text-primary)]">{title}</h1>
      <p className="mb-8 mt-2 max-w-2xl text-callout text-[var(--color-text-secondary)]">{desc}</p>
      <CatalogBrowser domains={domains} premium={premium} apps={catalogApps} view={view} />
    </main>
  );
}
