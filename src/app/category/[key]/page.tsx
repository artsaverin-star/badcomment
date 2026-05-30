import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategoryProducts } from "@/lib/queries";
import { getCategory } from "@/lib/categories";
import { getLocale, t, categoryLabelL, themeLabelL } from "@/lib/i18n";

export const dynamic = "force-dynamic";

const STORE_LABEL: Record<string, string> = { google: "Google Play", apple: "App Store" };

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const category = getCategory(key);
  if (!category) notFound();

  const locale = await getLocale();
  const tr = t(locale);
  const products = await getCategoryProducts(key);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <Link href="/" className="text-sm text-neutral-500 hover:underline">
        {tr.nav.allDirections}
      </Link>

      <header className="mb-8 mt-4">
        <h1 className="text-2xl font-bold">{categoryLabelL(locale, key)}</h1>
        <p className="text-sm text-neutral-500">{tr.category.subtitle}</p>
      </header>

      {products.length === 0 ? (
        <p className="text-sm text-neutral-500">{tr.category.empty}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {products.map((p) => (
            <li key={p.id}>
              <Link
                href={`/product/${p.id}`}
                className="flex items-center gap-4 rounded-xl border border-black/10 bg-white p-4 transition hover:border-red-400 dark:border-white/10 dark:bg-neutral-900"
              >
                {p.rank != null && (
                  <span className="w-6 shrink-0 text-center text-lg font-bold text-neutral-400">
                    {p.rank}
                  </span>
                )}
                {p.icon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.icon} alt="" className="h-12 w-12 rounded-lg" />
                ) : (
                  <div className="h-12 w-12 rounded-lg bg-black/10 dark:bg-white/10" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{p.name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                    {p.stores.map((s) => (
                      <span
                        key={s}
                        className="rounded-full bg-black/5 px-2 py-0.5 dark:bg-white/10"
                      >
                        {STORE_LABEL[s]}
                      </span>
                    ))}
                    <span>{tr.category.complaints(p.negativeCount)}</span>
                  </div>
                  {p.topThemes.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {p.topThemes.map((theme) => (
                        <span
                          key={theme.key}
                          className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700 dark:bg-red-950 dark:text-red-300"
                        >
                          {themeLabelL(locale, theme.key)} · {theme.count}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
