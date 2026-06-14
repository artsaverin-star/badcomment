import Link from "next/link";
import { getLegal, legalValue } from "@/lib/legal";

export const dynamic = "force-dynamic";

// Public requisites/contacts page (required by ЮKassa). Data comes from
// src/data/legal.json.
export default function ContactsPage() {
  const l = getLegal();
  const rows: Array<[string, string]> = [
    ["Исполнитель", l.selfEmployed ? `${legalValue(l.fullName)} (самозанятый, НПД)` : legalValue(l.fullName)],
    ["ИНН", legalValue(l.inn)],
    ["E-mail", legalValue(l.email)],
    ["Телефон", legalValue(l.phone)],
    ["Сайт", l.site],
  ];
  return (
    <main className="mx-auto w-full max-w-[680px] px-4 py-14">
      <h1 className="text-[28px] font-bold tracking-[-0.01em] text-[var(--color-text-primary)]">Контакты и реквизиты</h1>
      <p className="mt-3 text-callout text-[var(--color-text-secondary)]">
        {l.brand} — сервис разборов отзывов мобильных приложений с выводами. По вопросам подписки и оплаты пишите на e-mail ниже.
      </p>
      <dl className="mt-8 flex flex-col divide-y divide-[var(--color-border-subtle)] rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] px-5">
        {rows.map(([k, v]) => (
          <div key={k} className="flex flex-col gap-1 py-4 sm:flex-row sm:items-baseline sm:gap-4">
            <dt className="w-40 shrink-0 text-footnote text-[var(--color-text-tertiary)]">{k}</dt>
            <dd className="text-callout text-[var(--color-text-primary)]">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-6 text-caption text-[var(--color-text-tertiary)]">
        Обновлено: {l.updated}. Публичная оферта — на странице{" "}
        <Link href="/offer" className="text-[var(--color-text-brand)] hover:underline">/offer</Link>.
      </p>
    </main>
  );
}
