import Link from "next/link";
import type { ReactNode } from "react";
import { BRAND, SITE_URL, WEB_SELLER } from "@/site/config";
import type { Locale } from "@/site/i18n/locales";
import { routes } from "@/site/routing";
import { getLegal, legalValue } from "@/lib/legal";
import { ACCESS_PRICE_RUB } from "@/lib/tokenConfig";

// The website's public payment offer (публичная оферта) — /<L>/offer/payment. Required by
// YooKassa; the checkout links here. The Russian text is the legal document and is kept
// byte-identical to src/app/(old)/offer/payment/page.tsx in every locale (the price comes from
// ACCESS_PRICE_RUB, prices are frozen — DECISIONS §10). /offer (Terms of Use) is NOT this page.

export type PaymentDoc = { title: string; edition: string; sections: Array<[string, ReactNode]> };

const linkCls = "ia-legal-link";

export function paymentDoc(locale: Locale): PaymentDoc {
  const l = { brand: BRAND, site: SITE_URL, ...WEB_SELLER, phone: getLegal().phone, updated: getLegal().updated };
  const seller = `${legalValue(l.fullName)}${l.selfEmployed ? ", самозанятый (плательщик НПД)" : ""}, ИНН ${legalValue(l.inn)}`;

  const sections: Array<[string, ReactNode]> = [
    [
      "1. Общие положения",
      <>
        Настоящий документ является публичной офертой {seller} (далее — «Исполнитель») и адресован любому
        дееспособному физическому лицу (далее — «Пользователь»). Оплачивая доступ на сервисе {l.brand} ({l.site}),
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
        Доступ предоставляется за разовый платёж. Актуальная стоимость указана на странице{" "}
        <Link href={routes.plus(locale, { source: "offer_payment" })} className={linkCls}>«Доступ»</Link> и на момент
        оплаты: {ACCESS_PRICE_RUB} ₽ за бессрочный доступ ко всем материалам сервиса. Оплата производится онлайн банковской картой или через СБП через платёжный
        сервис ЮKassa (ООО НКО «ЮМани») либо через Telegram Stars. Цены указаны в рублях РФ.
      </>,
    ],
    [
      "4. Порядок предоставления доступа",
      <>
        Премиум-доступ активируется в аккаунте Пользователя на сайте {l.brand} <b>автоматически сразу после
        успешной оплаты</b> и действует бессрочно. Никакой доставки или отправки физических носителей не
        требуется — услуга предоставляется в электронном виде на сайте.
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
        <Link href={routes.contacts(locale)} className={linkCls}>«Контакты»</Link>.
      </>,
    ],
  ];

  return { title: "Публичная оферта", edition: `Редакция от ${l.updated}`, sections };
}
