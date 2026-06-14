import Link from "next/link";
import { getLegal, legalValue } from "@/lib/legal";

export const dynamic = "force-dynamic";

// Public offer (публичная оферта) — required by ЮKassa for accepting card
// payments. Requisites come from src/data/legal.json.
export default function OfferPage() {
  const l = getLegal();
  const seller = `${legalValue(l.fullName)}${l.selfEmployed ? ", самозанятый (плательщик НПД)" : ""}, ИНН ${legalValue(l.inn)}`;

  const sections: Array<[string, React.ReactNode]> = [
    [
      "1. Общие положения",
      <>
        Настоящий документ является публичной офертой {seller} (далее — «Исполнитель») и адресован любому
        дееспособному физическому лицу (далее — «Пользователь»). Оплачивая подписку на сервисе {l.brand} ({l.site}),
        Пользователь полностью и безоговорочно принимает условия настоящей оферты (акцепт).
      </>,
    ],
    [
      "2. Предмет оферты",
      <>
        Исполнитель предоставляет Пользователю доступ к платным материалам сервиса {l.brand} — разборам отзывов
        мобильных приложений, инсайтам по категориям и идеям продуктов (далее — «Премиум-доступ»). Премиум-доступ —
        это цифровая услуга; материальные товары не поставляются.
      </>,
    ],
    [
      "3. Стоимость и порядок оплаты",
      <>
        Стоимость и сроки указаны на странице{" "}
        <Link href="/premium" className="text-[var(--color-text-brand)] hover:underline">«Премиум»</Link>: 1000 ₽ за 1 месяц
        или 3000 ₽ за 6 месяцев. Оплата производится онлайн банковской картой через платёжный сервис ЮKassa
        (ООО НКО «ЮМани») либо через Telegram Stars. Цены фиксированные и указаны в рублях РФ.
      </>,
    ],
    [
      "4. Порядок предоставления доступа",
      <>
        Премиум-доступ активируется в аккаунте Пользователя на сайте {l.brand} <b>автоматически сразу после
        успешной оплаты</b> и действует в течение оплаченного периода (30 или 180 дней). Никакой доставки или
        отправки физических носителей не требуется — услуга предоставляется в электронном виде на сайте.
      </>,
    ],
    [
      "5. Возврат средств",
      <>
        Поскольку услуга предоставляется в цифровом виде и доступ открывается немедленно, возврат возможен, если
        доступ не был фактически предоставлен по вине Исполнителя. Для возврата напишите на {legalValue(l.email)} с
        указанием даты и суммы платежа; заявка рассматривается в течение 10 рабочих дней.
      </>,
    ],
    [
      "6. Реквизиты и контакты Исполнителя",
      <>
        {legalValue(l.fullName)}
        {l.selfEmployed ? " (самозанятый, НПД)" : ""}, ИНН {legalValue(l.inn)}. E-mail: {legalValue(l.email)}
        {l.phone ? `, телефон: ${l.phone}` : ""}. Полные контакты — на странице{" "}
        <Link href="/contacts" className="text-[var(--color-text-brand)] hover:underline">«Контакты»</Link>.
      </>,
    ],
  ];

  return (
    <main className="mx-auto w-full max-w-[720px] px-4 py-14">
      <h1 className="text-[28px] font-bold tracking-[-0.01em] text-[var(--color-text-primary)]">
        Публичная оферта
      </h1>
      <p className="mt-2 text-caption text-[var(--color-text-tertiary)]">Редакция от {l.updated}</p>
      <div className="mt-8 flex flex-col gap-7">
        {sections.map(([h, body]) => (
          <section key={h}>
            <h2 className="text-[17px] font-semibold text-[var(--color-text-primary)]">{h}</h2>
            <p className="mt-2 text-callout leading-[1.7] text-[var(--color-text-secondary)]">{body}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
