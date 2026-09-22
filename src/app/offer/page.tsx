import type { Metadata } from "next";
import Link from "next/link";
import { getLegal, legalValue } from "@/lib/legal";
import { getLocale } from "@/lib/i18n.server";
import { APPLE_EULA_URL, APPLE_REFUND_URL, IOS_PRIVACY_URL } from "@/lib/legalPages";

export const dynamic = "force-dynamic";

// Terms of Use for inApp (the iOS app and inapp.pro). The iOS app opens
// /ru|en/offer from Settings → Terms of Use, so App Review reads this page: it
// carries the App Store subscription terms and must not mention website
// prices or web checkout — that is the payment offer at /offer/payment.
// /en is English, /ru is Russian, same content.

const EFFECTIVE = { en: "September 22, 2026", ru: "22 сентября 2026 г." };

export async function generateMetadata(): Promise<Metadata> {
  const ru = (await getLocale()) !== "en";
  return ru
    ? {
        title: "Условия использования — inApp",
        description: "Условия использования iOS-приложения inApp и сайта inapp.pro: подписка inApp Plus, возвраты, конфиденциальность и контакты.",
      }
    : {
        title: "Terms of Use — inApp",
        description: "Terms of Use for the inApp iOS app and inapp.pro: the inApp Plus subscription, refunds, privacy and contact.",
      };
}

const linkCls = "text-[var(--color-text-brand)] underline-offset-2 hover:underline [overflow-wrap:anywhere]";

function P({ children }: { children: React.ReactNode }) {
  return <p>{children}</p>;
}

function UL({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="flex list-disc flex-col gap-1.5 pl-5 marker:text-[var(--color-text-tertiary)]">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

function Ext({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} className={linkCls} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

type Section = { id: string; title: string; body: React.ReactNode };

export default async function TermsPage() {
  const locale = await getLocale();
  const ru = locale !== "en";
  const lp = ru ? "/ru" : "/en";
  const l = getLegal();
  const email = legalValue(l.email);
  const mail = (
    <a href={`mailto:${email}`} className={linkCls}>
      {email}
    </a>
  );
  const eula = ru ? (
    <Ext href={APPLE_EULA_URL}>Стандартного лицензионного соглашения Apple с конечным пользователем</Ext>
  ) : (
    <Ext href={APPLE_EULA_URL}>Apple’s Standard Licensed Application End User License Agreement</Ext>
  );
  const refund = <Ext href={APPLE_REFUND_URL}>reportaproblem.apple.com</Ext>;
  const privacy = ru ? (
    <Ext href={IOS_PRIVACY_URL}>Политике конфиденциальности inApp</Ext>
  ) : (
    <Ext href={IOS_PRIVACY_URL}>inApp Privacy Policy</Ext>
  );
  const support = (
    <Link href={`${lp}/contacts`} className={linkCls}>
      {ru ? "страница поддержки" : "Support page"}
    </Link>
  );

  const en: Section[] = [
    {
      id: "provider",
      title: "Who provides inApp",
      body: (
        <P>
          inApp is provided by {legalValue(l.fullNameEn)} ({legalValue(l.fullName)})
          {l.selfEmployed ? ", a self-employed individual (professional income tax payer)" : ""} in the Russian
          Federation, INN {legalValue(l.inn)} (“we”, “us”). E-mail: {mail}.
        </P>
      ),
    },
    {
      id: "service",
      title: "What inApp is",
      body: (
        <P>
          inApp publishes editorial breakdowns of public app-store reviews and product ideas based on them. The content
          is available in the inApp iOS app and on the website inapp.pro. We may add, update or remove breakdowns and
          features over time. If you have accepted a separate agreement with us for a paid service (for example, the
          public offer published on the website inapp.pro), that agreement prevails over these Terms for that service
          where they conflict.
        </P>
      ),
    },
    {
      id: "eula",
      title: "The iOS app and Apple’s EULA",
      body: (
        <P>
          The inApp iOS app is licensed to you, not sold, under {eula} (the “Apple EULA”). These Terms supplement the
          Apple EULA. For the iOS app, if these Terms conflict with the Apple EULA, the Apple EULA prevails.
        </P>
      ),
    },
    {
      id: "plus",
      title: "inApp Plus: subscription and lifetime purchase",
      body: (
        <>
          <P>
            inApp Plus unlocks all breakdowns and ideas in the iOS app and unlimited export (“Download the document”).
            It is sold as an in-app purchase through Apple in two options:
          </P>
          <UL
            items={[
              <><b>Annual subscription</b> — an auto-renewable subscription billed once a year.</>,
              <><b>Lifetime</b> — a one-time purchase that does not renew.</>,
            ]}
          />
          <P>
            The price for your country or region is shown in the app before purchase. Payment is charged to your Apple
            Account when you confirm the purchase. No free trial is currently offered.
          </P>
          <P>
            The annual subscription renews automatically unless it is cancelled at least 24 hours before the end of the
            current period. Your account is charged for renewal within 24 hours before the end of the current period.
          </P>
          <P>
            You can manage or cancel the subscription in your App Store account settings: on iPhone, open Settings →
            your name → Subscriptions. After cancellation, access remains until the end of the paid period.
          </P>
          <P>
            Refunds for App Store purchases are handled by Apple under its policies: you can request one at {refund}.
            We cannot issue refunds for App Store purchases ourselves.
          </P>
          <P>
            The app has no account and no sign-in: access is tied to your Apple Account. To restore purchases on a new
            or reset device, sign in with the same Apple Account, open the Saved tab in the app, tap the gear icon
            (Settings) and tap Restore purchases. The purchase screen also has a Restore button.
          </P>
        </>
      ),
    },
    {
      id: "free",
      title: "What is free",
      body: (
        <P>
          Without a purchase, the iOS app includes the Interior Design breakdown and 5 of its ideas. Other breakdowns
          and ideas in the app require inApp Plus.
        </P>
      ),
    },
    {
      id: "content",
      title: "About the content",
      body: (
        <>
          <P>
            inApp content is an informational analysis of publicly available app-store reviews. Quotes from reviews may
            be abridged or translated from the original language. The content reflects our editorial interpretation; it is not professional, legal, financial or
            investment advice, and we do not guarantee any results from using it. You make your own decisions based on
            it.
          </P>
          <P>
            Names of third-party apps and companies, and their trademarks, belong to their respective owners and are
            used only to identify the apps discussed. inApp is not affiliated with, endorsed or sponsored by them.
          </P>
        </>
      ),
    },
    {
      id: "use",
      title: "Acceptable use",
      body: (
        <>
          <P>You may use inApp for personal purposes and for your own internal business work. You agree not to:</P>
          <UL
            items={[
              "resell, republish or redistribute inApp content, or copy it in bulk;",
              "download content from the app or the website by automated means, except through interfaces we provide for that purpose;",
              "bypass purchase checks or other technical restrictions;",
              "reverse engineer the app, except where permitted by law or the Apple EULA;",
              "use the Service in violation of applicable law.",
            ]}
          />
        </>
      ),
    },
    {
      id: "ip",
      title: "Intellectual property",
      body: (
        <P>
          The inApp app, website, design, breakdown texts, ideas, illustrations and compilations are protected by
          intellectual property law and belong to us or our licensors. Review quotes remain the property of their
          authors and are used to the extent necessary for analysis and commentary. Apart from the limited right to use
          the Service under these Terms (and, for the iOS app, the Apple EULA), no rights are transferred to you.
        </P>
      ),
    },
    {
      id: "privacy",
      title: "Privacy",
      body: (
        <>
          <P>How the iOS app handles data is described in the {privacy}. In short:</P>
          <UL
            items={[
              "the app needs no account and does not ask for your name, e-mail or other contact details;",
              "notes and bookmarks stay on your device and are not sent to our servers;",
              "payments are processed by Apple; the app only receives information about your access;",
              "purchase and subscription statistics are processed by RevenueCat with a random installation identifier that is not linked to your identity;",
              "there is no advertising tracking.",
            ]}
          />
        </>
      ),
    },
    {
      id: "removal",
      title: "Quote removal and copyright",
      body: (
        <P>
          If you wrote a review quoted in inApp, or believe that material in inApp infringes your rights, e-mail {mail}{" "}
          with the name of the breakdown or a link, the quote, and your request. We will review it and remove or
          correct the material where appropriate.
        </P>
      ),
    },
    {
      id: "liability",
      title: "Limitation of liability",
      body: (
        <P>
          The Service is provided “as is” and “as available”. To the maximum extent permitted by applicable law, we are
          not liable for indirect or consequential losses, lost profits or lost data arising from the use of, or
          inability to use, the Service or its content, and our total liability is limited to the amount you paid for
          the Service in the 12 months before the claim. Nothing in these Terms limits rights that you have as a
          consumer under mandatory law.
        </P>
      ),
    },
    {
      id: "changes",
      title: "Changes to these Terms",
      body: (
        <P>
          We may update these Terms. The current version and its effective date are always published on this page. If
          you continue to use the Service after an update takes effect, the updated Terms apply to you.
        </P>
      ),
    },
    {
      id: "contact",
      title: "Contact",
      body: (
        <P>
          Questions about these Terms or the Service: {mail}. Help with the app: {support}.
        </P>
      ),
    },
  ];

  const ruSections: Section[] = [
    {
      id: "provider",
      title: "Кто предоставляет inApp",
      body: (
        <P>
          inApp предоставляет {legalValue(l.fullName)} ({legalValue(l.fullNameEn)})
          {l.selfEmployed ? ", самозанятый (плательщик налога на профессиональный доход)" : ""}, Российская Федерация,
          ИНН {legalValue(l.inn)} (далее — «мы»). E-mail: {mail}.
        </P>
      ),
    },
    {
      id: "service",
      title: "Что такое inApp",
      body: (
        <P>
          inApp публикует редакционные разборы публичных отзывов из магазинов приложений и идеи продуктов на их основе.
          Материалы доступны в iOS-приложении inApp и на сайте inapp.pro. Мы можем добавлять, обновлять и убирать
          разборы и функции. Если в отношении платной услуги вы заключили с нами отдельный договор (например, приняли
          публичную оферту, опубликованную на сайте inapp.pro), при противоречии с Условиями в отношении этой услуги
          действует такой договор.
        </P>
      ),
    },
    {
      id: "eula",
      title: "iOS-приложение и лицензионное соглашение Apple",
      body: (
        <P>
          iOS-приложение inApp не продаётся, а предоставляется по лицензии на условиях {eula} (Licensed Application End
          User License Agreement, далее — «EULA Apple»). Настоящие Условия дополняют EULA Apple. Если в отношении
          iOS-приложения Условия противоречат EULA Apple, действует EULA Apple.
        </P>
      ),
    },
    {
      id: "plus",
      title: "inApp Plus: подписка и бессрочный доступ",
      body: (
        <>
          <P>
            inApp Plus открывает в iOS-приложении все разборы и идеи, а также экспорт без ограничений («Скачать
            документ»). Plus продаётся как встроенная покупка через Apple в двух вариантах:
          </P>
          <UL
            items={[
              <><b>Годовая подписка</b> — автоматически продлеваемая подписка с оплатой раз в год.</>,
              <><b>Бессрочный доступ</b> — разовая покупка без продления.</>,
            ]}
          />
          <P>
            Цена для вашей страны или региона показывается в приложении до покупки. Оплата списывается с вашего
            аккаунта Apple при подтверждении покупки. Бесплатный пробный период сейчас не предоставляется.
          </P>
          <P>
            Подписка продлевается автоматически, если её не отменить не позднее чем за 24 часа до окончания текущего
            периода. Плата за продление списывается с аккаунта в течение 24 часов до окончания текущего периода.
          </P>
          <P>
            Управлять подпиской и отменить её можно в настройках аккаунта App Store: на iPhone откройте «Настройки» →
            ваше имя → «Подписки». После отмены доступ сохраняется до конца оплаченного периода.
          </P>
          <P>
            Возвраты за покупки в App Store рассматривает Apple по своим правилам: запрос можно отправить на {refund}.
            Сами мы не можем вернуть деньги за покупку в App Store.
          </P>
          <P>
            В приложении нет аккаунта и входа: доступ привязан к вашему аккаунту Apple. Чтобы восстановить покупки на
            новом или сброшенном устройстве, войдите в тот же аккаунт Apple, откройте в приложении вкладку
            «Сохранённое», нажмите шестерёнку («Настройки») и выберите «Восстановить покупки». Кнопка «Восстановить»
            есть и на экране покупки.
          </P>
        </>
      ),
    },
    {
      id: "free",
      title: "Что доступно бесплатно",
      body: (
        <P>
          Без покупки в iOS-приложении доступны разбор «Дизайн интерьера и планировка» и 5 его идей. Остальные разборы и
          идеи в приложении открываются с inApp Plus.
        </P>
      ),
    },
    {
      id: "content",
      title: "О характере материалов",
      body: (
        <>
          <P>
            Материалы inApp — информационный анализ общедоступных отзывов из магазинов приложений. Цитаты из отзывов
            могут приводиться с сокращениями и в переводе с языка оригинала. Материалы отражают редакционную интерпретацию, не являются
            профессиональной, юридической, финансовой или инвестиционной консультацией и не гарантируют какого-либо
            результата. Решения на их основе вы принимаете самостоятельно.
          </P>
          <P>
            Названия сторонних приложений и компаний и их товарные знаки принадлежат правообладателям и используются
            только для указания на обсуждаемые приложения. inApp не связан с ними, не одобрен и не спонсируется ими.
          </P>
        </>
      ),
    },
    {
      id: "use",
      title: "Допустимое использование",
      body: (
        <>
          <P>Вы можете пользоваться inApp в личных целях и для внутренних задач своего бизнеса. Запрещается:</P>
          <UL
            items={[
              "перепродавать, публиковать или распространять материалы inApp либо массово их копировать;",
              "автоматически выгружать материалы из приложения или с сайта, кроме как через предоставленные нами для этого интерфейсы;",
              "обходить проверку покупок и другие технические ограничения;",
              "декомпилировать приложение, кроме случаев, разрешённых законом или EULA Apple;",
              "использовать Сервис в нарушение применимого законодательства.",
            ]}
          />
        </>
      ),
    },
    {
      id: "ip",
      title: "Интеллектуальная собственность",
      body: (
        <P>
          Приложение, сайт, дизайн, тексты разборов, идеи, иллюстрации и подборки inApp охраняются законодательством об
          интеллектуальной собственности и принадлежат нам или нашим лицензиарам. Цитаты из отзывов остаются
          собственностью их авторов и используются в объёме, необходимом для анализа и комментирования. Кроме
          ограниченного права пользоваться Сервисом на этих Условиях (а для iOS-приложения — и на условиях EULA Apple),
          вам не передаются никакие права.
        </P>
      ),
    },
    {
      id: "privacy",
      title: "Конфиденциальность",
      body: (
        <>
          <P>Как iOS-приложение обращается с данными, описано в {privacy}. Кратко:</P>
          <UL
            items={[
              "приложению не нужен аккаунт, оно не запрашивает имя, e-mail или другие контактные данные;",
              "заметки и закладки хранятся на вашем устройстве и не отправляются на наши серверы;",
              "платежи обрабатывает Apple; приложение получает только сведения о вашем доступе;",
              "статистику покупок и подписок обрабатывает RevenueCat со случайным идентификатором установки, не связанным с вашей личностью;",
              "рекламного отслеживания нет.",
            ]}
          />
        </>
      ),
    },
    {
      id: "removal",
      title: "Удаление цитат и авторские права",
      body: (
        <P>
          Если вы автор отзыва, процитированного в inApp, или считаете, что материалы inApp нарушают ваши права,
          напишите на {mail}: укажите название разбора или ссылку, цитату и суть требования. Мы рассмотрим обращение и
          при наличии оснований удалим или исправим материал.
        </P>
      ),
    },
    {
      id: "liability",
      title: "Ограничение ответственности",
      body: (
        <P>
          Сервис предоставляется «как есть» и «по мере доступности». В максимальной степени, допустимой применимым
          законодательством, мы не несём ответственности за косвенные убытки, упущенную выгоду и потерю данных,
          возникшие в связи с использованием Сервиса или его материалов либо невозможностью их использования, а наша
          совокупная ответственность ограничена суммой, которую вы заплатили за Сервис за 12 месяцев до предъявления
          требования. Условия не ограничивают права, которые есть у вас как у потребителя в силу императивных норм
          закона.
        </P>
      ),
    },
    {
      id: "changes",
      title: "Изменение Условий",
      body: (
        <P>
          Мы можем обновлять Условия. Актуальная редакция и дата её вступления в силу всегда опубликованы на этой
          странице. Продолжая пользоваться Сервисом после вступления изменений в силу, вы принимаете обновлённые
          Условия.
        </P>
      ),
    },
    {
      id: "contact",
      title: "Контакты",
      body: (
        <P>
          Вопросы об Условиях и Сервисе: {mail}. Помощь с приложением — {support}.
        </P>
      ),
    },
  ];

  const sections = ru ? ruSections : en;

  return (
    <main className="mx-auto w-full max-w-[720px] px-4 py-14">
      <h1 className="text-title1 text-balance text-[var(--color-text-primary)]">
        {ru ? "Условия использования" : "Terms of Use"}
      </h1>
      <p className="mt-2 text-caption text-[var(--color-text-tertiary)]">
        {ru ? `inApp · Действуют с ${EFFECTIVE.ru}` : `inApp · Effective ${EFFECTIVE.en}`}
      </p>
      <p className="mt-6 text-callout leading-[1.7] text-[var(--color-text-secondary)]">
        {ru
          ? "Настоящие Условия использования (далее — «Условия») регулируют использование inApp — iOS-приложения inApp и сайта inapp.pro (вместе — «Сервис»). Скачивая, устанавливая или используя Сервис, вы соглашаетесь с Условиями. Если вы не согласны с ними, пожалуйста, не используйте Сервис."
          : "These Terms of Use (the “Terms”) govern your use of inApp — the inApp iOS app and the website inapp.pro (together, the “Service”). By downloading, installing or using the Service, you agree to these Terms. If you do not agree, please do not use the Service."}
      </p>

      <nav aria-label={ru ? "Содержание" : "Contents"} className="card-min mt-8 rounded-[22px] px-5 py-4">
        <p className="text-footnote text-[var(--color-text-tertiary)]">{ru ? "Содержание" : "Contents"}</p>
        <ol className="mt-2 flex list-decimal flex-col gap-1 pl-5 text-callout marker:text-[var(--color-text-tertiary)]">
          {sections.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="text-[var(--color-text-brand)] underline-offset-2 hover:underline">
                {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="mt-10 flex flex-col gap-8">
        {sections.map((s, i) => (
          <section key={s.id} id={s.id} className="scroll-mt-24">
            <h2 className="text-[17px] font-semibold text-balance text-[var(--color-text-primary)]">
              <a href={`#${s.id}`} className="hover:underline">
                {i + 1}. {s.title}
              </a>
            </h2>
            <div className="mt-2 flex flex-col gap-3 text-callout leading-[1.7] text-[var(--color-text-secondary)]">
              {s.body}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
