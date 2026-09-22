import type { Metadata } from "next";
import Link from "next/link";
import { oldHref } from "@/lib/oldHref";
import { getLegal } from "@/lib/legal";
import { getLocale } from "@/lib/i18n.server";
import { APPLE_REFUND_URL, IOS_PRIVACY_URL } from "@/lib/legalPages";

export const dynamic = "force-dynamic";

// Support page. It is the App Store Support URL and the iOS app's "Contact the
// developer" link, so App Review reads it: no website prices or buy buttons.
// Developer details match App Store Connect (src/data/legal.json → appDeveloper);
// the website's payment requisites live in the offer at /offer/payment.

export async function generateMetadata(): Promise<Metadata> {
  const ru = (await getLocale()) !== "en";
  return ru
    ? {
        title: "Поддержка inApp",
        description: "Как связаться с разработчиком inApp, восстановить покупку, управлять подпиской и запросить возврат.",
      }
    : {
        title: "inApp Support",
        description: "How to contact the inApp developer, restore a purchase, manage your subscription and request a refund.",
      };
}

const linkCls = "text-[var(--color-text-brand)] underline-offset-2 hover:underline [overflow-wrap:anywhere]";

function Ext({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} className={linkCls} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

function SectionBlock({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mt-10 scroll-mt-24">
      <h2 className="text-title3 text-[var(--color-text-primary)]">{title}</h2>
      <div className="mt-3 flex flex-col gap-3 text-callout leading-[1.7] text-[var(--color-text-secondary)]">
        {children}
      </div>
    </section>
  );
}

export default async function SupportPage() {
  const locale = await getLocale();
  const ru = locale !== "en";
  const l = getLegal();
  const dev = l.appDeveloper;
  const email = dev.email;
  const mail = (
    <a href={`mailto:${email}`} className={linkCls}>
      {email}
    </a>
  );
  const refund = <Ext href={APPLE_REFUND_URL}>reportaproblem.apple.com</Ext>;

  const faq: Array<{ id: string; q: string; a: React.ReactNode }> = ru
    ? [
        {
          id: "restore",
          q: "Как восстановить покупку в iOS-приложении?",
          a: "Откройте в приложении вкладку «Сохранённое», нажмите шестерёнку («Настройки») и выберите «Восстановить покупки» — или нажмите «Восстановить» на экране покупки. Проверьте, что вы вошли в тот же аккаунт Apple, с которого покупали inApp Plus. Своего аккаунта и входа в приложении нет: доступ привязан к аккаунту Apple.",
        },
        {
          id: "subscription",
          q: "Как управлять подпиской или отменить её?",
          a: "Подписками управляет Apple. На iPhone откройте «Настройки» → ваше имя → «Подписки», выберите inApp и нажмите «Отменить подписку». Чтобы следующее продление не списалось, отмените подписку не позднее чем за 24 часа до конца текущего периода; доступ сохранится до конца оплаченного периода. Пока подписка активна, в «Настройках» приложения есть и пункт «Управление подпиской».",
        },
        {
          id: "refund",
          q: "Как вернуть деньги за покупку в App Store?",
          a: (
            <>
              Возвраты за покупки в App Store оформляет Apple. Откройте {refund}, войдите с аккаунтом Apple и отправьте
              запрос на возврат по покупке inApp. Сами мы не можем вернуть деньги за покупку в App Store. С любым другим
              вопросом об оплате или доступе пишите на {mail}.
            </>
          ),
        },
        {
          id: "notes",
          q: "Где хранятся заметки и закладки?",
          a: "Только на вашем устройстве (и в резервных копиях iPhone, если они включены). Приложение не отправляет их на наши серверы и не синхронизирует между устройствами. Если удалить приложение, они удалятся с устройства; восстановление покупки их не вернёт.",
        },
        {
          id: "quote",
          q: "Как сообщить о цитате?",
          a: (
            <>
              Если вы автор отзыва, процитированного в inApp, или считаете, что цитата или другой материал нарушает ваши
              права, напишите на {mail}: укажите разбор, цитату и суть просьбы. Мы рассмотрим обращение и при наличии
              оснований удалим или исправим материал.
            </>
          ),
        },
      ]
    : [
        {
          id: "restore",
          q: "How do I restore a purchase in the iOS app?",
          a: "Open the Saved tab in the app, tap the gear icon (Settings) and tap Restore purchases — or tap Restore on the purchase screen. Make sure you are signed in with the same Apple Account you used to buy inApp Plus. The app has no account or sign-in of its own: access is tied to your Apple Account.",
        },
        {
          id: "subscription",
          q: "How do I manage or cancel my subscription?",
          a: "Subscriptions are managed by Apple. On iPhone, open Settings → your name → Subscriptions, choose inApp and tap Cancel Subscription. To avoid the next charge, cancel at least 24 hours before the end of the current period; access remains until the end of the paid period. While a subscription is active, the app’s Settings also show a Manage subscription link.",
        },
        {
          id: "refund",
          q: "How do I get a refund for an App Store purchase?",
          a: (
            <>
              Refunds for App Store purchases are handled by Apple. Go to {refund}, sign in with your Apple Account and
              request a refund for the inApp purchase. We cannot issue refunds for App Store purchases ourselves. For any
              other payment or access question, e-mail {mail}.
            </>
          ),
        },
        {
          id: "notes",
          q: "Where are my notes and bookmarks stored?",
          a: "Only on your device (and in your iPhone backups, if backups are turned on). The app does not upload them to our servers or sync them between devices. If you delete the app, they are deleted from the device; restoring a purchase does not bring them back.",
        },
        {
          id: "quote",
          q: "How do I report a quote?",
          a: (
            <>
              If you wrote a review quoted in inApp, or believe a quote or other material infringes your rights, e-mail{" "}
              {mail} with the name of the breakdown, the quote and your request. We will review it and remove or correct
              the material where appropriate.
            </>
          ),
        },
      ];

  const rows: Array<[string, string]> = ru
    ? [
        ["Разработчик", dev.name],
        ["Адрес", dev.addressRu],
        ["E-mail", email],
        ["Сайт", l.site],
      ]
    : [
        ["Developer", dev.name],
        ["Address", dev.addressEn],
        ["E-mail", email],
        ["Website", l.site],
      ];

  return (
    <main className="mx-auto w-full max-w-[680px] px-4 py-14">
      <h1 className="text-title1 text-[var(--color-text-primary)]">{ru ? "Поддержка inApp" : "inApp Support"}</h1>
      <p className="mt-3 text-callout text-[var(--color-text-secondary)]">
        {ru ? "Помощь с iOS-приложением inApp и сайтом inapp.pro." : "Help with the inApp iOS app and the website inapp.pro."}
      </p>

      <SectionBlock id="contact" title={ru ? "Как связаться" : "Contact us"}>
        <p>
          E-mail: {mail}
        </p>
        <p>{ru ? "Чтобы мы быстрее помогли, укажите:" : "To help us answer faster, please include:"}</p>
        <ul className="flex list-disc flex-col gap-1.5 pl-5 marker:text-[var(--color-text-tertiary)]">
          {(ru
            ? [
                "модель устройства и версию iOS;",
                "версию приложения (откройте вкладку «Сохранённое» и нажмите шестерёнку — версия указана внизу экрана «Настройки»);",
                "коротко, что случилось, и по возможности приложите скриншот.",
              ]
            : [
                "your device model and iOS version;",
                "the app version (open the Saved tab and tap the gear icon — the version is shown at the bottom of Settings);",
                "a short description of the problem and, if possible, a screenshot.",
              ]
          ).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </SectionBlock>

      <SectionBlock id="faq" title={ru ? "Частые вопросы" : "Frequently asked questions"}>
        <div className="flex flex-col gap-6">
          {faq.map((item) => (
            <div key={item.id} id={item.id} className="scroll-mt-24">
              <h3 className="text-[17px] font-semibold text-[var(--color-text-primary)]">{item.q}</h3>
              <p className="mt-1.5">{item.a}</p>
            </div>
          ))}
        </div>
      </SectionBlock>

      <SectionBlock id="legal" title={ru ? "Документы" : "Legal"}>
        <ul className="flex list-disc flex-col gap-1.5 pl-5 marker:text-[var(--color-text-tertiary)]">
          <li>
            <Link href={oldHref(locale, "/offer")} className={linkCls}>
              {ru ? "Условия использования" : "Terms of Use"}
            </Link>
          </li>
          <li>
            <Ext href={IOS_PRIVACY_URL}>{ru ? "Политика конфиденциальности iOS-приложения" : "Privacy Policy (iOS app)"}</Ext>
          </li>
        </ul>
      </SectionBlock>

      <SectionBlock id="developer" title={ru ? "Разработчик" : "Developer information"}>
        <dl className="card-min flex flex-col divide-y divide-[var(--color-border-subtle)] rounded-[22px] px-5">
          {rows.map(([k, v]) => (
            <div key={k} className="flex flex-col gap-1 py-4 sm:flex-row sm:items-baseline sm:gap-4">
              <dt className="w-40 shrink-0 text-footnote text-[var(--color-text-tertiary)]">{k}</dt>
              <dd className="text-callout text-[var(--color-text-primary)] [overflow-wrap:anywhere]">
                {k === "E-mail" ? mail : v}
              </dd>
            </div>
          ))}
        </dl>
      </SectionBlock>
    </main>
  );
}
