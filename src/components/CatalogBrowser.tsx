import Link from "next/link";

export type BrowseApp = { name: string; icon: string | null; ready?: boolean };
export type BrowseAppItem = { name: string; icon: string | null; slug: string; reviews: number; free: boolean };
export type BrowseCategory = {
  slug: string;
  name: string;
  appsCount: number;
  apps: BrowseApp[];
  live: boolean; // synthesis published (≥10 разборов)
  free: boolean; // free for everyone (the flagship set)
  locked: boolean; // live but premium-gated for this viewer
};
export type BrowseDomain = { slug: string; name: string; categories: BrowseCategory[] };

function appsWord(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return "приложение";
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return "приложения";
  return "приложений";
}

function reviewsWord(n: number): string {
  const d = n % 10;
  const dd = n % 100;
  if (dd >= 11 && dd <= 14) return "отзывов";
  if (d === 1) return "отзыв";
  if (d >= 2 && d <= 4) return "отзыва";
  return "отзывов";
}

export default function CatalogBrowser({
  domains,
  apps = [],
  view: viewProp = "cats",
}: {
  domains: BrowseDomain[];
  premium?: boolean;
  apps?: BrowseAppItem[];
  view?: "cats" | "apps";
}) {
  const hasApps = apps.length > 0;
  // View is driven by the URL (?view=apps), read server-side in page.tsx and
  // passed in — keeps this a server component (no client serialization of the
  // whole catalog into the HTML).
  const view = viewProp === "apps" && hasApps ? "apps" : "cats";

  return (
    <div className="route-fade flex flex-col gap-8">
      {view === "apps" && hasApps ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {apps.map((a) => (
            <Link
              key={a.slug}
              href={`/${a.slug}`}
              className="flex items-center gap-3 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] px-3.5 py-3 transition-colors hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-card-subtle)]"
            >
              {a.icon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.icon} alt="" className="size-10 shrink-0 rounded-[11px] object-cover" />
              ) : (
                <div className="size-10 shrink-0 rounded-[11px] bg-[var(--color-bg-muted)]" />
              )}
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-callout font-medium text-[var(--color-text-primary)]">{a.name}</span>
                {a.reviews > 0 && (
                  <span className="truncate text-caption tabular-nums text-[var(--color-text-tertiary)]">
                    разобрали {a.reviews.toLocaleString("ru-RU")} {reviewsWord(a.reviews)}
                  </span>
                )}
              </span>
              <StatusBadge kind={a.free ? "free" : "premium"} />
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0 text-[var(--color-text-tertiary)]">
                <path d="m6 4 4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-10">
          {domains.map((d) => (
            <section key={d.slug} className="flex flex-col gap-3">
              <h2 className="text-[22px] font-bold tracking-[-0.01em] text-[var(--color-text-primary)]">{d.name}</h2>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {d.categories.map((c) => (
                  <CategoryCard key={c.slug} cat={c} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ kind }: { kind: "free" | "premium" | "soon" }) {
  const map = {
    free: { label: "Бесплатно", cls: "bg-[color-mix(in_srgb,#30d158_18%,transparent)] text-[#4ade80]" },
    premium: { label: "Премиум", cls: "bg-[var(--color-accent-brand-subtle)] text-[var(--color-text-brand)]" },
    soon: { label: "Скоро", cls: "bg-[var(--color-bg-muted)] text-[var(--color-text-tertiary)]" },
  }[kind];
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${map.cls}`}>{map.label}</span>
  );
}

function CategoryCard({ cat }: { cat: BrowseCategory }) {
  const icons = cat.apps.filter((a) => a.icon).slice(0, 4);
  const dim = !cat.live; // «Скоро» categories are greyscale
  const status: "free" | "premium" | "soon" = !cat.live ? "soon" : cat.free ? "free" : "premium";
  const body = (
    <>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className={`truncate text-callout font-semibold ${dim ? "text-[var(--color-text-tertiary)]" : "text-[var(--color-text-primary)]"}`}>
          {cat.name}
        </span>
        <span className="flex items-center gap-2">
          <StatusBadge kind={status} />
          {cat.live && (
            <span className="truncate text-caption tabular-nums text-[var(--color-text-tertiary)]">
              {cat.appsCount} {appsWord(cat.appsCount)}
            </span>
          )}
        </span>
      </span>
      <div className="flex shrink-0 -space-x-2">
        {icons.map((a, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={a.icon ?? ""}
            alt=""
            // Grey only apps that genuinely lack a разбор — a «Скоро» category can
            // already have analyzed apps (synthesis just isn't published yet).
            className={`size-9 rounded-[11px] object-cover ring-2 ring-[var(--color-surface-card)] ${a.ready === false ? "opacity-40 grayscale" : ""}`}
          />
        ))}
      </div>
    </>
  );

  const shell = "flex items-center gap-3 rounded-2xl border px-3.5 py-3 transition-colors";

  if (!cat.live) {
    return <div className={`${shell} border-[var(--color-border-subtle)] bg-[var(--color-bg-subtle)]`}>{body}</div>;
  }
  return (
    <Link
      href={`/segment/${cat.slug}`}
      className={`${shell} bg-[var(--color-surface-card)] hover:bg-[var(--color-surface-card-subtle)] ${
        cat.free ? "free-card" : "border-[var(--color-border-subtle)] hover:border-[var(--color-border-strong)]"
      }`}
    >
      {body}
    </Link>
  );
}
