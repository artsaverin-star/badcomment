import { codeStats } from "@/lib/appStoreCodes";
import { importAppStoreCodes } from "./appCodesActions";

// «Промокоды App Store» on the admin page: pool stats + CSV import (see src/lib/appStoreCodes.ts).
export default async function AppCodesSection({ result }: { result: Record<string, string | undefined> }) {
  const s = await codeStats();
  const cells: Array<[string, number]> = [
    ["Кодов всего", s.total],
    ["Выдано", s.assigned],
    ["Свободно", s.freeValid],
    ["Истекло без выдачи", s.expiredFree],
    ["Купили навсегда", s.eligibleUsers],
    ["Ждут код", s.eligibleWithoutCode],
  ];
  return (
    <section id="app-codes">
      <h2 className="mt-10 text-[20px] font-semibold tracking-[-0.02em] text-[var(--color-text-primary)]">
        Промокоды App Store (lifetime для iPhone)
      </h2>
      <p className="mt-1.5 text-callout text-[var(--color-text-secondary)]">
        Каждый, кто купил доступ навсегда на сайте, получает личный одноразовый код на «inApp Plus Lifetime» в
        iOS-приложении. Код виден только ему — в «Настройках» нового сайта и после оплаты.
      </p>
      {result.codes === "ok" ? (
        <p className="mt-3 rounded-[var(--radius-lg)] bg-[var(--color-bg-subtle)] px-4 py-3 text-callout text-[var(--color-text-primary)]">
          Импортировано: {result.created ?? 0}, уже были: {result.existing ?? 0}, с ошибкой: {result.invalid ?? 0}. Выдано
          покупателям сейчас: {result.assigned ?? 0}
          {Number(result.waiting ?? 0) > 0 ? `, не хватило кодов: ${result.waiting}` : ""}.
        </p>
      ) : result.codes ? (
        <p className="mt-3 text-callout text-[var(--color-text-danger,#c0443f)]">Импорт не выполнен: {result.codes}.</p>
      ) : null}
      <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border-subtle)] bg-[var(--color-border-subtle)] sm:grid-cols-3">
        {cells.map(([label, n]) => (
          <div key={label} className="bg-[var(--color-bg-page)] px-4 py-3">
            <div className="text-caption text-[var(--color-text-tertiary)]">{label}</div>
            <div className="mt-1 text-[22px] font-semibold tabular-nums text-[var(--color-text-primary)]">{n}</div>
          </div>
        ))}
      </div>
      <form action={importAppStoreCodes} className="mt-4 flex flex-col gap-3">
        <label className="flex flex-col gap-1.5 text-footnote text-[var(--color-text-secondary)]">
          CSV из App Store Connect (строки «КОД,ссылка»)
          <textarea
            name="csv"
            required
            rows={6}
            spellCheck={false}
            className="rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-page)] p-3 font-mono text-[13px] text-[var(--color-text-primary)]"
            placeholder="ABCDEFGH12345678XY,https://apps.apple.com/redeem?ctx=offercodes&id=6814396315&code=ABCDEFGH12345678XY"
          />
        </label>
        <div className="flex flex-wrap gap-3">
          <label className="flex flex-col gap-1.5 text-footnote text-[var(--color-text-secondary)]">
            Партия
            <input
              name="batch"
              defaultValue="a6478ad4 2026-09-23"
              className="rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-page)] px-3 py-2 text-callout text-[var(--color-text-primary)]"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-footnote text-[var(--color-text-secondary)]">
            Истекают (дата из App Store Connect)
            <input
              name="expires"
              type="date"
              defaultValue="2027-03-22"
              className="rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-page)] px-3 py-2 text-callout text-[var(--color-text-primary)]"
            />
          </label>
        </div>
        <button
          type="submit"
          className="self-start rounded-full bg-[var(--color-text-primary)] px-5 py-2.5 text-callout font-semibold text-[var(--color-bg-page)]"
        >
          Импортировать и раздать покупателям
        </button>
      </form>
    </section>
  );
}
