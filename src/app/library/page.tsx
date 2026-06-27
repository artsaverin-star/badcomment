import Link from "next/link";
import { Suspense } from "react";
import { Header } from "@saverin/ui-web";
import { getAccess } from "@/lib/access";
import { getLibrary, type LibItem } from "@/lib/library";
import PurchaseTracker from "@/components/PurchaseTracker";

export const dynamic = "force-dynamic";

// «Купленное» — everything the user unlocked with tokens (direct purchases).
export default async function LibraryPage() {
  const access = await getAccess();

  return (
    <main className="mx-auto w-full max-w-[640px] px-4 py-14">
      <Suspense fallback={null}>
        <PurchaseTracker />
      </Suspense>
      <Header size="L" as="h1" className="mb-3 items-center text-center" title="Купленное" />

      {!access.loggedIn ? (
        <p className="mt-8 text-center text-callout text-[var(--color-text-secondary)]">
          Войдите, чтобы видеть открытые разборы.
        </p>
      ) : access.unlimited ? (
        <div className="mt-8 rounded-[var(--radius-2xl)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-8 text-center">
          <p className="text-lead font-semibold text-[var(--color-text-primary)]">⭐ Полный доступ</p>
          <p className="mx-auto mt-2 max-w-xs text-callout text-[var(--color-text-secondary)]">
            У тебя открыты все приложения, идеи и категории.
          </p>
          <Link href="/catalog" className="mt-5 inline-flex rounded-full bg-[var(--color-button-primary-bg)] px-5 py-2.5 text-callout font-semibold text-[var(--color-button-primary-text)] hover:opacity-90">
            Открыть каталог
          </Link>
        </div>
      ) : (
        <Library userId={access.user!.id} />
      )}
    </main>
  );
}

async function Library({ userId }: { userId: string }) {
  const { categories, ideas, apps } = await getLibrary(userId);
  const empty = categories.length + ideas.length + apps.length === 0;

  return (
    <div className="mt-6 flex flex-col gap-8">
      <Link
        href="/tokens"
        className="flex items-center justify-between gap-3 rounded-[var(--radius-xl)] border border-[var(--color-border-strong)] bg-[var(--color-surface-card)] px-4 py-3 transition-colors hover:border-[var(--color-text-brand)]"
      >
        <span className="text-callout text-[var(--color-text-primary)]">Открыть больше — колода и Lifetime</span>
        <span className="shrink-0 text-footnote font-semibold text-[var(--color-text-brand)]">В магазин →</span>
      </Link>

      {empty ? (
        <p className="py-10 text-center text-callout text-[var(--color-text-tertiary)]">
          Пока ничего не открыто. Загляни в каталог или идеи.
        </p>
      ) : (
        <>
          <Section title="Категории" items={categories} />
          <Section title="Идеи" items={ideas} />
          <Section title="Приложения" items={apps} />
        </>
      )}
    </div>
  );
}

function Section({ title, items }: { title: string; items: LibItem[] }) {
  if (items.length === 0) return null;
  return (
    <section>
      <h2 className="mb-3 text-[18px] font-bold tracking-[-0.01em] text-[var(--color-text-primary)]">
        {title} <span className="tabular-nums text-[var(--color-text-tertiary)]">{items.length}</span>
      </h2>
      <div className="flex flex-col gap-2">
        {items.map((it) => (
          <Link
            key={it.slug}
            href={it.href}
            className="flex items-center gap-3 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] px-3.5 py-3 transition-colors hover:border-[var(--color-border-strong)]"
          >
            {it.icon ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={it.icon} alt="" loading="lazy" decoding="async" className="size-9 shrink-0 rounded-[10px] object-cover" />
            ) : null}
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-callout font-medium text-[var(--color-text-primary)]">{it.name}</span>
              {it.sub ? <span className="truncate text-caption text-[var(--color-text-tertiary)]">{it.sub}</span> : null}
            </span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0 text-[var(--color-text-tertiary)]">
              <path d="m6 4 4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        ))}
      </div>
    </section>
  );
}
