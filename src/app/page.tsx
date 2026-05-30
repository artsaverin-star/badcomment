import Link from "next/link";
import SearchBox from "@/components/SearchBox";
import ThemeBars from "@/components/ThemeBars";
import { getCategoriesOverview, getGlobalThemeStats } from "@/lib/queries";
import { getLocale, t, categoryLabelL } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function Home() {
  const locale = await getLocale();
  const tr = t(locale);
  const [categories, globalThemes] = await Promise.all([
    getCategoriesOverview(),
    getGlobalThemeStats(),
  ]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          bad<span className="text-red-600">comment</span>
        </h1>
        <p className="mt-1 text-neutral-500">{tr.home.tagline}</p>
      </header>

      <section className="mb-8">
        <Link
          href="/ideas"
          className="flex items-center justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 p-5 transition hover:border-red-400 dark:border-red-900 dark:bg-red-950/40"
        >
          <div>
            <p className="text-lg font-semibold">{tr.home.ideaDeckCta}</p>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
              {tr.home.ideaDeckDesc}
            </p>
          </div>
          <span className="hidden text-4xl sm:block">🔥</span>
        </Link>
      </section>

      <section className="mb-10">
        <SearchBox labels={tr.search} />
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold">{tr.home.browseByDirection}</h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <li key={c.key}>
              <Link
                href={`/category/${c.key}`}
                className="flex h-full flex-col justify-between rounded-xl border border-black/10 bg-white p-4 transition hover:border-red-400 dark:border-white/10 dark:bg-neutral-900"
              >
                <span className="font-medium">{categoryLabelL(locale, c.key)}</span>
                <span className="mt-2 text-sm text-neutral-500">
                  {c.productCount > 0
                    ? tr.home.appsComplaints(c.productCount, c.reviewCount)
                    : tr.home.notCrawled}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {globalThemes.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">{tr.home.topThemes}</h2>
          <ThemeBars stats={globalThemes} locale={locale} />
        </section>
      )}
    </main>
  );
}
