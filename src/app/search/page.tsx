import MobileSearch from "@/components/MobileSearch";
import { getLocale } from "@/lib/i18n.server";

export const dynamic = "force-dynamic";

export default async function SearchPage() {
  const locale = await getLocale();
  return (
    <main className="mx-auto w-full max-w-2xl px-2 sm:px-4 py-8">
      <h1 className="mb-5 text-[26px] font-bold tracking-[-0.01em] text-[var(--color-text-primary)]">
        {locale === "en" ? "Search" : "Поиск"}
      </h1>
      <MobileSearch locale={locale} />
    </main>
  );
}
