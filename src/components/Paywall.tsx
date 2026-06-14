import Link from "next/link";

// Premium gate shown in place of locked category content.
export default function Paywall({ title }: { title?: string }) {
  return (
    <div className="mx-auto mt-10 max-w-md rounded-[var(--radius-2xl)] border border-[var(--color-text-brand)] bg-[var(--color-surface-card)] p-8 text-center">
      <h2 className="text-[22px] font-semibold tracking-[-0.01em] text-[var(--color-text-primary)]">
        {title ?? "Доступно в премиуме"}
      </h2>
      <p className="mx-auto mt-2.5 max-w-xs text-callout text-[var(--color-text-secondary)]">
        Полные разборы, инсайты категории и идеи открыты по премиум-подписке. Четыре категории доступны бесплатно.
      </p>
      <Link
        href="/premium"
        className="mt-5 inline-flex items-center justify-center rounded-full bg-[var(--color-button-primary-bg)] px-5 py-2.5 text-callout font-semibold text-[var(--color-button-primary-text)] hover:opacity-90"
      >
        Подключить премиум
      </Link>
    </div>
  );
}
