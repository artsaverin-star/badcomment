import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, Header, Tag, buttonVariants, cn } from "@saverin/ui-web";
import { getCategoryProducts } from "@/lib/queries";
import { getCategory } from "@/lib/categories";
import { t, categoryLabelL, themeLabelL } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n.server";

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
      <Link href="/" className={cn(buttonVariants({ variant: "ghost", size: "S" }), "mb-6")}>
        {tr.nav.allDirections}
      </Link>

      <Header
        size="L"
        as="h1"
        className="mb-8"
        title={categoryLabelL(locale, key)}
        description={tr.category.subtitle}
      />

      {products.length === 0 ? (
        <p className="text-[15px] text-[var(--color-text-tertiary)]">{tr.category.empty}</p>
      ) : (
        <Card>
          <div className="flex flex-col">
            {products.map((p) => (
              <Link
                key={p.id}
                href={`/product/${p.id}`}
                className="flex items-start gap-3 rounded-[var(--radius-md)] px-2 py-3 hover:bg-[var(--color-bg-muted)]"
              >
                {p.rank != null && (
                  <span className="mt-1 w-6 shrink-0 text-center text-[15px] font-semibold tabular-nums text-[var(--color-text-tertiary)]">
                    {p.rank}
                  </span>
                )}
                {p.icon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.icon}
                    alt=""
                    className="mt-0.5 size-11 shrink-0 rounded-[var(--radius-md)] object-cover"
                  />
                ) : (
                  <div className="mt-0.5 size-11 shrink-0 rounded-[var(--radius-md)] bg-[var(--color-surface-card-subtle)]" />
                )}
                <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="truncate text-[15px] font-medium text-[var(--color-text-primary)]">
                      {p.name}
                    </span>
                    {p.developer && (
                      <span className="truncate text-[12px] text-[var(--color-text-tertiary)]">
                        {p.developer}
                      </span>
                    )}
                  </span>
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-[var(--color-text-tertiary)]">
                    {p.stores.map((s) => (
                      <Tag key={s} tone="neutral" size="S">
                        {STORE_LABEL[s]}
                      </Tag>
                    ))}
                    <span className="tabular-nums">{tr.category.complaints(p.negativeCount)}</span>
                  </span>
                  {p.topThemes.length > 0 && (
                    <span className="flex flex-wrap gap-1.5">
                      {p.topThemes.map((theme) => (
                        <Tag key={theme.key} tone="danger" size="S">
                          {themeLabelL(locale, theme.key)} · {theme.count}
                        </Tag>
                      ))}
                    </span>
                  )}
                </span>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </main>
  );
}
