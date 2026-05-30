import Link from "next/link";
import { notFound } from "next/navigation";
import ThemeBars from "@/components/ThemeBars";
import { getProductDetail } from "@/lib/queries";
import { themeLabel } from "@/lib/themes";
import { categoryLabel } from "@/lib/categories";

export const dynamic = "force-dynamic";

const STORE_LABEL: Record<string, string> = { google: "Google Play", apple: "App Store" };

export default async function ProductDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getProductDetail(id);
  if (!data) notFound();

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <Link href="/" className="text-sm text-neutral-500 hover:underline">
        ← Back
      </Link>

      <header className="mb-8 mt-4 flex items-center gap-4">
        {data.icon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={data.icon} alt="" className="h-16 w-16 rounded-xl" />
        ) : (
          <div className="h-16 w-16 rounded-xl bg-black/10 dark:bg-white/10" />
        )}
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">{data.name}</h1>
          <p className="text-sm text-neutral-500">
            {data.developer ? `${data.developer} · ` : ""}
            {data.stores.map((s) => STORE_LABEL[s]).join(" + ")} ·{" "}
            {data.totalNegative} negative reviews
            {data.category ? (
              <>
                {" · "}
                <Link href={`/category/${data.category}`} className="hover:underline">
                  {categoryLabel(data.category)}
                </Link>
              </>
            ) : null}
          </p>
        </div>
      </header>

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold">Complaint themes (both stores)</h2>
        <ThemeBars stats={data.themeStats} />
      </section>

      {data.stores.length > 1 && (
        <section className="mb-10 grid gap-6 sm:grid-cols-2">
          {data.byStore.map((b) => (
            <div key={b.store}>
              <h3 className="mb-3 text-sm font-semibold text-neutral-500">
                {STORE_LABEL[b.store]} · {b.count} reviews
              </h3>
              <ThemeBars stats={b.themeStats} />
            </div>
          ))}
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold">Negative reviews</h2>
        <ul className="flex flex-col gap-3">
          {data.reviews.map((r) => (
            <li
              key={r.id}
              className="rounded-xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-neutral-900"
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-red-600">
                  {"★".repeat(r.rating)}
                  {"☆".repeat(5 - r.rating)}
                </span>
                <span className="text-xs text-neutral-400">
                  {STORE_LABEL[r.store]} · {r.author ?? "anon"}
                  {r.postedAt ? ` · ${r.postedAt.toISOString().slice(0, 10)}` : ""}
                </span>
              </div>
              {r.title && <p className="font-medium">{r.title}</p>}
              <p className="text-sm text-neutral-600 dark:text-neutral-300">{r.text}</p>
              {r.themes.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {r.themes.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700 dark:bg-red-950 dark:text-red-300"
                    >
                      {themeLabel(t)}
                    </span>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
