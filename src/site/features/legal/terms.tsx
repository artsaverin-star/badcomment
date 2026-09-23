import Link from "next/link";
import type { ReactNode } from "react";
import { APP_DEVELOPER } from "@/site/config";
import type { Locale } from "@/site/i18n/locales";
import { APPLE_EULA_URL, APPLE_REFUND_URL, IOS_PRIVACY_URL } from "@/lib/legalPages";
import { Ext, MailLink, P, UL, type LegalSection } from "./components";

// Terms of Use of inApp (the iOS app + inapp.pro) — /<L>/offer.
// The iOS app opens /{ru,en}/offer from Settings → «Условия использования», so App Review
// reads this page: it carries the App Store subscription terms and must never mention website
// prices, web payment methods or link to the purchase pages (DECISIONS "Legal pages").
// en and ru come from the App-Review hotfix (src/app/(old)/offer/page.tsx); de / fr / ja are
// faithful translations in the app's informal voice. 2026-09-23: the "no account" statements were
// replaced for the optional inApp account of app 1.1 (docs/site-v2/APP-ACCOUNTS.md) — sign-in in
// the app's Settings → Account, bookmark/note sync, deletion; still no web prices or payments.

export type TermsDoc = { title: string; effective: string; intro: string; contents: string; sections: LegalSection[] };

export function termsDoc(locale: Locale, supportHref: string): TermsDoc {
  const dev = APP_DEVELOPER;
  const mail = <MailLink email={dev.email} />;
  const refund = <Ext href={APPLE_REFUND_URL}>reportaproblem.apple.com</Ext>;
  const support = (label: string): ReactNode => (
    <Link href={supportHref} className="ia-legal-link">
      {label}
    </Link>
  );
  switch (locale) {
    case "ru":
      return ru(dev, mail, refund, support("страница поддержки"));
    case "de":
      return de(dev, mail, refund, support("Support-Seite"));
    case "fr":
      return fr(dev, mail, refund, support("page d’assistance"));
    case "ja":
      return ja(dev, mail, refund, support("サポートページ"));
    default:
      return en(dev, mail, refund, support("Support page"));
  }
}

type Dev = typeof APP_DEVELOPER;

function en(dev: Dev, mail: ReactNode, refund: ReactNode, support: ReactNode): TermsDoc {
  const eula = <Ext href={APPLE_EULA_URL}>Apple’s Standard Licensed Application End User License Agreement</Ext>;
  const privacy = <Ext href={IOS_PRIVACY_URL}>inApp Privacy Policy</Ext>;
  return {
    title: "Terms of Use",
    effective: "inApp · Effective September 23, 2026",
    contents: "Contents",
    intro:
      "These Terms of Use (the “Terms”) govern your use of inApp — the inApp iOS app and the website inapp.pro (together, the “Service”). By downloading, installing or using the Service, you agree to these Terms. If you do not agree, please do not use the Service.",
    sections: [
      {
        id: "provider",
        title: "Who provides inApp",
        body: (
          <P>
            inApp is provided by {dev.name} (“we”, “us”), the developer of the inApp iOS app. Address: {dev.addressEn}.
            E-mail: {mail}.
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
            features over time. If you have accepted a separate agreement for a paid service on the website inapp.pro
            (for example, its public offer), that agreement prevails over these Terms for that service where they
            conflict.
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
                <>
                  <b>Annual subscription</b> — an auto-renewable subscription billed once a year.
                </>,
                <>
                  <b>Lifetime</b> — a one-time purchase that does not renew.
                </>,
              ]}
            />
            <P>
              The price for your country or region is shown in the app before purchase. Payment is charged to your
              Apple Account when you confirm the purchase. No free trial is currently offered.
            </P>
            <P>
              The annual subscription renews automatically unless it is cancelled at least 24 hours before the end of
              the current period. Your account is charged for renewal within 24 hours before the end of the current
              period.
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
              An inApp account is not required: access bought in the App Store is tied to your Apple Account. To
              restore purchases on a new or reset device, sign in with the same Apple Account, open the Saved tab in
              the app, tap the gear icon (Settings) and tap Restore purchases. The purchase screen also has a Restore
              button.
            </P>
            <P>
              If you sign in to an inApp account (in the app: Settings → Account), your bookmarks and notes are stored
              in the account and synced between your devices. You can sign out or delete the account in Settings at
              any time. Deleting the account erases it together with its bookmarks and notes; it does not cancel an
              App Store subscription, which you manage in your App Store account settings.
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
              inApp content is an informational analysis of publicly available app-store reviews. Quotes from reviews
              may be abridged or translated from the original language. The content reflects our editorial
              interpretation; it is not professional, legal, financial or investment advice, and we do not guarantee
              any results from using it. You make your own decisions based on it.
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
            authors and are used to the extent necessary for analysis and commentary. Apart from the limited right to
            use the Service under these Terms (and, for the iOS app, the Apple EULA), no rights are transferred to you.
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
                "an account is optional: without one, the app does not ask for your name, e-mail or other contact details; if you sign in, we keep the name and e-mail address your sign-in method shares (Sign in with Apple lets you hide your e-mail);",
                "without an account, notes and bookmarks stay on your device; after you sign in, they are also stored in your account on our servers so that they sync between your devices;",
                "payments are processed by Apple; the app only receives information about your access;",
                "purchase and subscription statistics are processed by RevenueCat with a random installation identifier or, after you sign in, your inApp account ID;",
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
            The Service is provided “as is” and “as available”. To the maximum extent permitted by applicable law, we
            are not liable for indirect or consequential losses, lost profits or lost data arising from the use of, or
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
    ],
  };
}

function ru(dev: Dev, mail: ReactNode, refund: ReactNode, support: ReactNode): TermsDoc {
  const eula = <Ext href={APPLE_EULA_URL}>Стандартного лицензионного соглашения Apple с конечным пользователем</Ext>;
  const privacy = <Ext href={IOS_PRIVACY_URL}>Политике конфиденциальности inApp</Ext>;
  return {
    title: "Условия использования",
    effective: "inApp · Действуют с 23 сентября 2026 г.",
    contents: "Содержание",
    intro:
      "Настоящие Условия использования (далее — «Условия») регулируют использование inApp — iOS-приложения inApp и сайта inapp.pro (вместе — «Сервис»). Скачивая, устанавливая или используя Сервис, вы соглашаетесь с Условиями. Если вы не согласны с ними, пожалуйста, не используйте Сервис.",
    sections: [
      {
        id: "provider",
        title: "Кто предоставляет inApp",
        body: (
          <P>
            inApp предоставляет {dev.name} (далее — «мы»), разработчик iOS-приложения inApp. Адрес: {dev.addressRu}.
            E-mail: {mail}.
          </P>
        ),
      },
      {
        id: "service",
        title: "Что такое inApp",
        body: (
          <P>
            inApp публикует редакционные разборы публичных отзывов из магазинов приложений и идеи продуктов на их
            основе. Материалы доступны в iOS-приложении inApp и на сайте inapp.pro. Мы можем добавлять, обновлять и
            убирать разборы и функции. Если в отношении платной услуги на сайте inapp.pro вы заключили отдельный договор
            (например, приняли его публичную оферту), при противоречии с Условиями в отношении этой услуги действует
            такой договор.
          </P>
        ),
      },
      {
        id: "eula",
        title: "iOS-приложение и лицензионное соглашение Apple",
        body: (
          <P>
            iOS-приложение inApp не продаётся, а предоставляется по лицензии на условиях {eula} (Licensed Application
            End User License Agreement, далее — «EULA Apple»). Настоящие Условия дополняют EULA Apple. Если в отношении
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
                <>
                  <b>Годовая подписка</b> — автоматически продлеваемая подписка с оплатой раз в год.
                </>,
                <>
                  <b>Бессрочный доступ</b> — разовая покупка без продления.
                </>,
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
              Аккаунт inApp не обязателен: доступ, купленный в App Store, привязан к вашему аккаунту Apple. Чтобы
              восстановить покупки на новом или сброшенном устройстве, войдите в тот же аккаунт Apple, откройте в
              приложении вкладку «Сохранённое», нажмите шестерёнку («Настройки») и выберите «Восстановить покупки».
              Кнопка «Восстановить» есть и на экране покупки.
            </P>
            <P>
              Если вы войдёте в аккаунт inApp (в приложении: «Настройки» → «Аккаунт»), закладки и заметки будут храниться
              в аккаунте и синхронизироваться между вашими устройствами. Выйти из аккаунта или удалить его можно в
              настройках в любой момент. Удаление стирает аккаунт вместе с закладками и заметками, но не отменяет
              подписку App Store — ею управляют в настройках аккаунта App Store.
            </P>
          </>
        ),
      },
      {
        id: "free",
        title: "Что доступно бесплатно",
        body: (
          <P>
            Без покупки в iOS-приложении доступны разбор «Дизайн интерьера и планировка» и 5 его идей. Остальные разборы
            и идеи в приложении открываются с inApp Plus.
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
              могут приводиться с сокращениями и в переводе с языка оригинала. Материалы отражают редакционную
              интерпретацию, не являются профессиональной, юридической, финансовой или инвестиционной консультацией и
              не гарантируют какого-либо результата. Решения на их основе вы принимаете самостоятельно.
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
            Приложение, сайт, дизайн, тексты разборов, идеи, иллюстрации и подборки inApp охраняются законодательством
            об интеллектуальной собственности и принадлежат нам или нашим лицензиарам. Цитаты из отзывов остаются
            собственностью их авторов и используются в объёме, необходимом для анализа и комментирования. Кроме
            ограниченного права пользоваться Сервисом на этих Условиях (а для iOS-приложения — и на условиях EULA
            Apple), вам не передаются никакие права.
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
                "аккаунт не обязателен: без него приложение не запрашивает имя, e-mail или другие контактные данные; если вы войдёте, мы храним имя и e-mail, которые передаёт выбранный способ входа (при входе через Apple почту можно скрыть);",
                "без аккаунта заметки и закладки хранятся только на вашем устройстве; после входа они хранятся и в аккаунте на наших серверах, чтобы синхронизироваться между устройствами;",
                "платежи обрабатывает Apple; приложение получает только сведения о вашем доступе;",
                "статистику покупок и подписок обрабатывает RevenueCat со случайным идентификатором установки, а после входа — с идентификатором вашего аккаунта inApp;",
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
    ],
  };
}

function de(dev: Dev, mail: ReactNode, refund: ReactNode, support: ReactNode): TermsDoc {
  const eula = <Ext href={APPLE_EULA_URL}>Apples Standard-Endbenutzer-Lizenzvertrag für lizenzierte Anwendungen</Ext>;
  const privacy = <Ext href={IOS_PRIVACY_URL}>Datenschutzerklärung von inApp</Ext>;
  return {
    title: "Nutzungsbedingungen",
    effective: "inApp · Gültig ab 23. September 2026",
    contents: "Inhalt",
    intro:
      "Diese Nutzungsbedingungen (die „Bedingungen“) regeln deine Nutzung von inApp – der iOS-App inApp und der Website inapp.pro (zusammen der „Dienst“). Indem du den Dienst herunterlädst, installierst oder nutzt, stimmst du diesen Bedingungen zu. Wenn du nicht einverstanden bist, nutze den Dienst bitte nicht.",
    sections: [
      {
        id: "provider",
        title: "Wer inApp anbietet",
        body: (
          <P>
            inApp wird von {dev.name} („wir“, „uns“) angeboten, dem Entwickler der iOS-App inApp. Adresse:{" "}
            {dev.addressEn}. E-Mail: {mail}.
          </P>
        ),
      },
      {
        id: "service",
        title: "Was inApp ist",
        body: (
          <P>
            inApp veröffentlicht redaktionelle Analysen öffentlicher Rezensionen aus App-Stores und darauf basierende
            Produktideen. Die Inhalte sind in der iOS-App inApp und auf der Website inapp.pro verfügbar. Wir können mit
            der Zeit Analysen und Funktionen hinzufügen, aktualisieren oder entfernen. Wenn du für einen kostenpflichtigen
            Dienst auf der Website inapp.pro eine gesonderte Vereinbarung angenommen hast (zum Beispiel ihr öffentliches
            Angebot), hat diese Vereinbarung für diesen Dienst bei Widersprüchen Vorrang vor diesen Bedingungen.
          </P>
        ),
      },
      {
        id: "eula",
        title: "Die iOS-App und Apples EULA",
        body: (
          <P>
            Die iOS-App inApp wird dir nicht verkauft, sondern lizenziert, und zwar nach {eula} (die „Apple-EULA“).
            Diese Bedingungen ergänzen die Apple-EULA. Widersprechen diese Bedingungen bei der iOS-App der Apple-EULA,
            gilt die Apple-EULA.
          </P>
        ),
      },
      {
        id: "plus",
        title: "inApp Plus: Abo und Kauf auf Lebenszeit",
        body: (
          <>
            <P>
              inApp Plus schaltet in der iOS-App alle Analysen und Ideen sowie den unbegrenzten Export („Dokument
              herunterladen“) frei. Plus wird als In-App-Kauf über Apple in zwei Varianten verkauft:
            </P>
            <UL
              items={[
                <>
                  <b>Jahresabo</b> – ein sich automatisch verlängerndes Abo, das einmal im Jahr abgerechnet wird.
                </>,
                <>
                  <b>Lebenslang</b> – ein einmaliger Kauf, der sich nicht verlängert.
                </>,
              ]}
            />
            <P>
              Der Preis für dein Land oder deine Region wird vor dem Kauf in der App angezeigt. Die Zahlung wird deinem
              Apple Account belastet, sobald du den Kauf bestätigst. Derzeit gibt es keinen kostenlosen Testzeitraum.
            </P>
            <P>
              Das Jahresabo verlängert sich automatisch, sofern es nicht spätestens 24 Stunden vor Ende des laufenden
              Zeitraums gekündigt wird. Die Verlängerung wird deinem Account innerhalb von 24 Stunden vor Ende des
              laufenden Zeitraums berechnet.
            </P>
            <P>
              Du kannst das Abo in den Einstellungen deines App-Store-Accounts verwalten oder kündigen: Öffne auf dem
              iPhone Einstellungen → dein Name → Abonnements. Nach der Kündigung bleibt der Zugang bis zum Ende des
              bezahlten Zeitraums bestehen.
            </P>
            <P>
              Erstattungen für Käufe im App Store bearbeitet Apple nach seinen Richtlinien: Du kannst sie unter {refund}{" "}
              beantragen. Für Käufe im App Store können wir selbst keine Erstattungen vornehmen.
            </P>
            <P>
              Ein inApp-Konto ist nicht nötig: Im App Store gekaufter Zugang ist an deinen Apple Account gebunden. Um
              Käufe auf einem neuen oder zurückgesetzten Gerät wiederherzustellen, melde dich mit demselben Apple Account
              an, öffne in der App den Tab „Gespeichert“, tippe auf das Zahnrad (Einstellungen) und dann auf „Käufe
              wiederherstellen“. Auch auf dem Kaufbildschirm gibt es eine Schaltfläche „Wiederherstellen“.
            </P>
            <P>
              Wenn du dich bei einem inApp-Konto anmeldest (in der App: Einstellungen → Konto), werden deine Lesezeichen
              und Notizen im Konto gespeichert und zwischen deinen Geräten synchronisiert. Abmelden oder das Konto löschen
              kannst du jederzeit in den Einstellungen. Beim Löschen werden das Konto und seine Lesezeichen und Notizen
              entfernt; ein App-Store-Abo wird dadurch nicht gekündigt – das verwaltest du in den Einstellungen deines
              App-Store-Accounts.
            </P>
          </>
        ),
      },
      {
        id: "free",
        title: "Was kostenlos ist",
        body: (
          <P>
            Ohne Kauf enthält die iOS-App die Analyse „Inneneinrichtung“ und 5 ihrer Ideen. Alle weiteren Analysen und
            Ideen in der App erfordern inApp Plus.
          </P>
        ),
      },
      {
        id: "content",
        title: "Über die Inhalte",
        body: (
          <>
            <P>
              Die Inhalte von inApp sind eine informative Auswertung öffentlich zugänglicher Rezensionen aus App-Stores.
              Zitate aus Rezensionen können gekürzt oder aus der Originalsprache übersetzt sein. Die Inhalte geben unsere
              redaktionelle Deutung wieder; sie sind keine professionelle, rechtliche, finanzielle oder
              Anlageberatung, und wir garantieren keine Ergebnisse aus ihrer Nutzung. Entscheidungen auf ihrer Grundlage
              triffst du selbst.
            </P>
            <P>
              Namen von Apps und Unternehmen Dritter sowie deren Marken gehören ihren jeweiligen Inhabern und werden
              nur verwendet, um die besprochenen Apps zu benennen. inApp ist mit ihnen weder verbunden noch wird es von
              ihnen empfohlen oder gesponsert.
            </P>
          </>
        ),
      },
      {
        id: "use",
        title: "Zulässige Nutzung",
        body: (
          <>
            <P>
              Du darfst inApp für private Zwecke und für die interne Arbeit deines eigenen Unternehmens nutzen. Du
              verpflichtest dich, Folgendes zu unterlassen:
            </P>
            <UL
              items={[
                "Inhalte von inApp weiterzuverkaufen, erneut zu veröffentlichen oder weiterzuverbreiten oder sie massenhaft zu kopieren;",
                "Inhalte aus der App oder von der Website automatisiert herunterzuladen, außer über Schnittstellen, die wir dafür bereitstellen;",
                "Kaufprüfungen oder andere technische Beschränkungen zu umgehen;",
                "die App zurückzuentwickeln, außer soweit Gesetz oder Apple-EULA dies erlauben;",
                "den Dienst unter Verstoß gegen geltendes Recht zu nutzen.",
              ]}
            />
          </>
        ),
      },
      {
        id: "ip",
        title: "Geistiges Eigentum",
        body: (
          <P>
            App, Website, Design, Analysetexte, Ideen, Illustrationen und Zusammenstellungen von inApp sind durch das
            Recht des geistigen Eigentums geschützt und gehören uns oder unseren Lizenzgebern. Zitate aus Rezensionen
            bleiben Eigentum ihrer Verfasser und werden in dem Umfang verwendet, der für Analyse und Kommentar nötig
            ist. Abgesehen vom eingeschränkten Recht, den Dienst nach diesen Bedingungen (und bei der iOS-App nach der
            Apple-EULA) zu nutzen, werden dir keine Rechte übertragen.
          </P>
        ),
      },
      {
        id: "privacy",
        title: "Datenschutz",
        body: (
          <>
            <P>Wie die iOS-App mit Daten umgeht, ist in der {privacy} beschrieben. Kurz gesagt:</P>
            <UL
              items={[
                "ein Konto ist freiwillig: Ohne Konto fragt die App weder nach deinem Namen noch nach deiner E-Mail-Adresse oder anderen Kontaktdaten; meldest du dich an, speichern wir den Namen und die E-Mail-Adresse, die deine Anmeldemethode übermittelt (bei „Mit Apple anmelden“ kannst du deine E-Mail-Adresse verbergen);",
                "ohne Konto bleiben Notizen und Lesezeichen auf deinem Gerät; nach der Anmeldung werden sie auch in deinem Konto auf unseren Servern gespeichert, damit sie zwischen deinen Geräten synchronisiert werden;",
                "Zahlungen wickelt Apple ab; die App erhält nur Angaben zu deinem Zugang;",
                "Kauf- und Abostatistiken verarbeitet RevenueCat mit einer zufälligen Installationskennung oder, nach der Anmeldung, mit der ID deines inApp-Kontos;",
                "es gibt kein Werbetracking.",
              ]}
            />
          </>
        ),
      },
      {
        id: "removal",
        title: "Entfernen von Zitaten und Urheberrecht",
        body: (
          <P>
            Wenn du eine Rezension geschrieben hast, die in inApp zitiert wird, oder meinst, dass Material in inApp deine
            Rechte verletzt, schreib an {mail} – mit dem Namen der Analyse oder einem Link, dem Zitat und deinem
            Anliegen. Wir prüfen die Anfrage und entfernen oder korrigieren das Material, wenn es begründet ist.
          </P>
        ),
      },
      {
        id: "liability",
        title: "Haftungsbeschränkung",
        body: (
          <P>
            Der Dienst wird „wie besehen“ und „wie verfügbar“ bereitgestellt. Soweit nach geltendem Recht zulässig,
            haften wir nicht für indirekte oder Folgeschäden, entgangenen Gewinn oder Datenverlust, die aus der Nutzung
            oder der Unmöglichkeit der Nutzung des Dienstes oder seiner Inhalte entstehen, und unsere Gesamthaftung ist
            auf den Betrag begrenzt, den du in den 12 Monaten vor dem Anspruch für den Dienst bezahlt hast. Nichts in
            diesen Bedingungen schränkt Rechte ein, die dir als Verbraucher nach zwingendem Recht zustehen.
          </P>
        ),
      },
      {
        id: "changes",
        title: "Änderungen dieser Bedingungen",
        body: (
          <P>
            Wir können diese Bedingungen aktualisieren. Die aktuelle Fassung und das Datum ihres Inkrafttretens sind
            immer auf dieser Seite veröffentlicht. Nutzt du den Dienst weiter, nachdem eine Änderung in Kraft getreten
            ist, gelten für dich die aktualisierten Bedingungen.
          </P>
        ),
      },
      {
        id: "contact",
        title: "Kontakt",
        body: (
          <P>
            Fragen zu diesen Bedingungen oder zum Dienst: {mail}. Hilfe zur App: {support}.
          </P>
        ),
      },
    ],
  };
}

function fr(dev: Dev, mail: ReactNode, refund: ReactNode, support: ReactNode): TermsDoc {
  const eula = <Ext href={APPLE_EULA_URL}>du contrat de licence standard d’Apple pour l’utilisateur final des applications sous licence</Ext>;
  const privacy = <Ext href={IOS_PRIVACY_URL}>Politique de confidentialité d’inApp</Ext>;
  return {
    title: "Conditions d’utilisation",
    effective: "inApp · En vigueur à partir du 23 septembre 2026",
    contents: "Sommaire",
    intro:
      "Les présentes Conditions d’utilisation (les « Conditions ») régissent ton utilisation d’inApp — l’app iOS inApp et le site inapp.pro (ensemble, le « Service »). En téléchargeant, en installant ou en utilisant le Service, tu acceptes ces Conditions. Si tu ne les acceptes pas, merci de ne pas utiliser le Service.",
    sections: [
      {
        id: "provider",
        title: "Qui fournit inApp",
        body: (
          <P>
            inApp est fourni par {dev.name} (« nous »), le développeur de l’app iOS inApp. Adresse : {dev.addressEn}.
            E-mail : {mail}.
          </P>
        ),
      },
      {
        id: "service",
        title: "Ce qu’est inApp",
        body: (
          <P>
            inApp publie des décryptages éditoriaux d’avis publics issus des magasins d’applications et des idées de
            produits qui en découlent. Les contenus sont disponibles dans l’app iOS inApp et sur le site inapp.pro. Nous
            pouvons ajouter, mettre à jour ou retirer des décryptages et des fonctionnalités au fil du temps. Si tu as
            accepté un contrat distinct pour un service payant sur le site inapp.pro (par exemple son offre publique), ce
            contrat prévaut sur les présentes Conditions pour ce service en cas de contradiction.
          </P>
        ),
      },
      {
        id: "eula",
        title: "L’app iOS et le CLUF d’Apple",
        body: (
          <P>
            L’app iOS inApp t’est concédée sous licence, et non vendue, selon les termes {eula} (le « CLUF d’Apple »).
            Les présentes Conditions complètent le CLUF d’Apple. Pour l’app iOS, en cas de contradiction entre ces
            Conditions et le CLUF d’Apple, le CLUF d’Apple prévaut.
          </P>
        ),
      },
      {
        id: "plus",
        title: "inApp Plus : abonnement et achat à vie",
        body: (
          <>
            <P>
              inApp Plus débloque dans l’app iOS tous les décryptages et toutes les idées ainsi que l’export illimité
              (« Télécharger le document »). Il est vendu sous forme d’achat intégré via Apple, en deux options :
            </P>
            <UL
              items={[
                <>
                  <b>Abonnement annuel</b> — un abonnement à renouvellement automatique, facturé une fois par an.
                </>,
                <>
                  <b>À vie</b> — un achat unique, sans renouvellement.
                </>,
              ]}
            />
            <P>
              Le prix pour ton pays ou ta région est indiqué dans l’app avant l’achat. Le paiement est débité de ton
              compte Apple lorsque tu confirmes l’achat. Aucun essai gratuit n’est proposé actuellement.
            </P>
            <P>
              L’abonnement annuel se renouvelle automatiquement, sauf s’il est résilié au moins 24 heures avant la fin
              de la période en cours. Le renouvellement est débité de ton compte dans les 24 heures qui précèdent la fin
              de la période en cours.
            </P>
            <P>
              Tu peux gérer ou résilier l’abonnement dans les réglages de ton compte App Store : sur iPhone, ouvre
              Réglages → ton nom → Abonnements. Après la résiliation, l’accès reste actif jusqu’à la fin de la période
              payée.
            </P>
            <P>
              Les remboursements des achats sur l’App Store sont traités par Apple selon ses règles : tu peux en
              demander un sur {refund}. Nous ne pouvons pas rembourser nous-mêmes les achats effectués sur l’App Store.
            </P>
            <P>
              Un compte inApp n’est pas nécessaire : l’accès acheté sur l’App Store est lié à ton compte Apple. Pour
              restaurer tes achats sur un appareil neuf ou réinitialisé, connecte-toi avec le même compte Apple, ouvre
              l’onglet « Enregistrés » dans l’app, touche la roue dentée (Réglages) puis « Restaurer les achats ».
              L’écran d’achat a aussi un bouton « Restaurer ».
            </P>
            <P>
              Si tu te connectes à un compte inApp (dans l’app : Réglages → Compte), tes signets et tes notes sont
              enregistrés dans le compte et synchronisés entre tes appareils. Tu peux te déconnecter ou supprimer le
              compte à tout moment dans les Réglages. La suppression efface le compte avec ses signets et ses notes ;
              elle ne résilie pas un abonnement App Store, que tu gères dans les réglages de ton compte App Store.
            </P>
          </>
        ),
      },
      {
        id: "free",
        title: "Ce qui est gratuit",
        body: (
          <P>
            Sans achat, l’app iOS comprend le décryptage « Design d’intérieur » et 5 de ses idées. Les autres
            décryptages et idées de l’app nécessitent inApp Plus.
          </P>
        ),
      },
      {
        id: "content",
        title: "À propos des contenus",
        body: (
          <>
            <P>
              Les contenus d’inApp sont une analyse informative d’avis publics issus des magasins d’applications. Les
              citations d’avis peuvent être abrégées ou traduites de leur langue d’origine. Les contenus reflètent notre
              interprétation éditoriale ; ils ne constituent pas un conseil professionnel, juridique, financier ou en
              investissement, et nous ne garantissons aucun résultat de leur utilisation. Tu prends tes propres
              décisions sur leur base.
            </P>
            <P>
              Les noms d’apps et d’entreprises tierces ainsi que leurs marques appartiennent à leurs titulaires
              respectifs et ne servent qu’à identifier les apps analysées. inApp n’est ni affilié à eux, ni approuvé, ni
              sponsorisé par eux.
            </P>
          </>
        ),
      },
      {
        id: "use",
        title: "Utilisation autorisée",
        body: (
          <>
            <P>
              Tu peux utiliser inApp à des fins personnelles et pour le travail interne de ta propre entreprise. Tu
              t’engages à ne pas :
            </P>
            <UL
              items={[
                "revendre, republier ou redistribuer les contenus d’inApp, ni les copier en masse ;",
                "télécharger des contenus de l’app ou du site par des moyens automatisés, sauf via les interfaces que nous fournissons à cet effet ;",
                "contourner les vérifications d’achat ou d’autres restrictions techniques ;",
                "faire de l’ingénierie inverse de l’app, sauf dans la mesure permise par la loi ou le CLUF d’Apple ;",
                "utiliser le Service en violation de la loi applicable.",
              ]}
            />
          </>
        ),
      },
      {
        id: "ip",
        title: "Propriété intellectuelle",
        body: (
          <P>
            L’app, le site, le design, les textes des décryptages, les idées, les illustrations et les compilations
            d’inApp sont protégés par le droit de la propriété intellectuelle et nous appartiennent ou appartiennent à
            nos concédants. Les citations d’avis restent la propriété de leurs auteurs et sont utilisées dans la mesure
            nécessaire à l’analyse et au commentaire. En dehors du droit limité d’utiliser le Service selon ces
            Conditions (et, pour l’app iOS, selon le CLUF d’Apple), aucun droit ne t’est transféré.
          </P>
        ),
      },
      {
        id: "privacy",
        title: "Confidentialité",
        body: (
          <>
            <P>La façon dont l’app iOS traite les données est décrite dans la {privacy}. En bref :</P>
            <UL
              items={[
                "un compte est facultatif : sans compte, l’app ne demande ni ton nom, ni ton e-mail, ni d’autres coordonnées ; si tu te connectes, nous conservons le nom et l’adresse e-mail transmis par le mode de connexion choisi (avec « Se connecter avec Apple », tu peux masquer ton adresse e-mail) ;",
                "sans compte, les notes et les signets restent sur ton appareil ; après ta connexion, ils sont aussi enregistrés dans ton compte sur nos serveurs pour se synchroniser entre tes appareils ;",
                "les paiements sont traités par Apple ; l’app ne reçoit que les informations sur ton accès ;",
                "les statistiques d’achats et d’abonnements sont traitées par RevenueCat avec un identifiant d’installation aléatoire ou, après ta connexion, avec l’identifiant de ton compte inApp ;",
                "il n’y a aucun suivi publicitaire.",
              ]}
            />
          </>
        ),
      },
      {
        id: "removal",
        title: "Retrait de citations et droit d’auteur",
        body: (
          <P>
            Si tu as écrit un avis cité dans inApp, ou si tu estimes qu’un contenu d’inApp porte atteinte à tes droits,
            écris à {mail} en indiquant le nom du décryptage ou un lien, la citation et ta demande. Nous l’examinerons et
            retirerons ou corrigerons le contenu si nécessaire.
          </P>
        ),
      },
      {
        id: "liability",
        title: "Limitation de responsabilité",
        body: (
          <P>
            Le Service est fourni « en l’état » et « selon disponibilité ». Dans toute la mesure permise par la loi
            applicable, nous ne sommes pas responsables des pertes indirectes ou consécutives, du manque à gagner ou de
            la perte de données résultant de l’utilisation ou de l’impossibilité d’utiliser le Service ou ses contenus,
            et notre responsabilité totale est limitée au montant que tu as payé pour le Service au cours des 12 mois
            précédant la réclamation. Rien dans ces Conditions ne limite les droits dont tu disposes en tant que
            consommateur en vertu de dispositions impératives.
          </P>
        ),
      },
      {
        id: "changes",
        title: "Modifications de ces Conditions",
        body: (
          <P>
            Nous pouvons mettre à jour ces Conditions. La version en vigueur et sa date d’entrée en vigueur sont
            toujours publiées sur cette page. Si tu continues à utiliser le Service après l’entrée en vigueur d’une mise
            à jour, les Conditions mises à jour s’appliquent à toi.
          </P>
        ),
      },
      {
        id: "contact",
        title: "Contact",
        body: (
          <P>
            Questions sur ces Conditions ou le Service : {mail}. Aide pour l’app : {support}.
          </P>
        ),
      },
    ],
  };
}

function ja(dev: Dev, mail: ReactNode, refund: ReactNode, support: ReactNode): TermsDoc {
  const eula = <Ext href={APPLE_EULA_URL}>Appleの標準使用許諾契約（Licensed Application End User License Agreement）</Ext>;
  const privacy = <Ext href={IOS_PRIVACY_URL}>inAppプライバシーポリシー</Ext>;
  return {
    title: "利用規約",
    effective: "inApp · 2026年9月23日発効",
    contents: "目次",
    intro:
      "この利用規約（以下「本規約」）は、inApp（iOSアプリ「inApp」とウェブサイトinapp.pro。以下あわせて「本サービス」）の利用に適用されます。本サービスをダウンロード、インストール、または利用することで、本規約に同意したものとみなされます。同意できない場合は、本サービスを利用しないでください。",
    sections: [
      {
        id: "provider",
        title: "inAppの提供者",
        body: (
          <P>
            inAppは、iOSアプリ「inApp」の開発者である{dev.name}（以下「当方」）が提供しています。住所：{dev.addressEn}。メール：
            {mail}。
          </P>
        ),
      },
      {
        id: "service",
        title: "inAppとは",
        body: (
          <P>
            inAppは、アプリストアに公開されているレビューを編集部が分析した記事と、それにもとづくプロダクトのアイデアを公開しています。コンテンツはiOSアプリ「inApp」とウェブサイトinapp.proで利用できます。分析や機能は、随時追加、更新、削除することがあります。ウェブサイトinapp.proの有料サービスについて別の契約（たとえば公開オファー）を承諾している場合、そのサービスに関して本規約と矛盾するときは、その契約が優先します。
          </P>
        ),
      },
      {
        id: "eula",
        title: "iOSアプリとAppleのEULA",
        body: (
          <P>
            iOSアプリ「inApp」は販売されるのではなく、{eula}（以下「Apple EULA」）にもとづいて使用が許諾されます。本規約はApple
            EULAを補足するものです。iOSアプリについて本規約とApple EULAが矛盾する場合は、Apple EULAが優先します。
          </P>
        ),
      },
      {
        id: "plus",
        title: "inApp Plus：サブスクリプションと買い切り",
        body: (
          <>
            <P>
              inApp
              Plusでは、iOSアプリのすべての分析とアイデア、そして無制限のエクスポート（「ドキュメントをダウンロード」）が利用できます。Plusは、Appleを通じたアプリ内課金として次の2種類で販売されます。
            </P>
            <UL
              items={[
                <>
                  <b>年額サブスクリプション</b>：年に1回請求される自動更新サブスクリプション。
                </>,
                <>
                  <b>買い切り</b>：更新のない1回限りの購入。
                </>,
              ]}
            />
            <P>
              お住まいの国・地域での価格は、購入前にアプリ内に表示されます。支払いは、購入を確定した時点でApple
              Accountに請求されます。現在、無料体験は提供していません。
            </P>
            <P>
              年額サブスクリプションは、現在の期間が終わる24時間前までに解約しないかぎり、自動的に更新されます。更新料金は、現在の期間が終わる前の24時間以内にアカウントに請求されます。
            </P>
            <P>
              サブスクリプションの管理や解約は、App
              Storeのアカウント設定で行えます。iPhoneでは「設定」→ 自分の名前 →「サブスクリプション」を開いてください。解約後も、支払い済みの期間が終わるまでアクセスは続きます。
            </P>
            <P>
              App Storeでの購入の返金は、Appleがその規定にしたがって扱います。{refund}
              から申請できます。App Storeでの購入について、当方が直接返金することはできません。
            </P>
            <P>
              inAppのアカウントは必須ではありません。App Storeで購入したアクセスはApple
              Accountにひもづいています。新しい端末や初期化した端末で購入を復元するには、同じApple
              Accountでサインインし、アプリの「保存済み」タブを開いて歯車（設定）をタップし、「購入を復元」をタップしてください。購入画面にも「復元」ボタンがあります。
            </P>
            <P>
              inAppのアカウントにサインインすると（アプリでは「設定」→「アカウント」）、ブックマークとメモがアカウントに保存され、端末間で同期されます。サインアウトやアカウントの削除は、いつでも設定から行えます。アカウントを削除すると、アカウントとそのブックマーク・メモは消去されますが、App
              Storeのサブスクリプションは解約されません。サブスクリプションはApp Storeのアカウント設定で管理してください。
            </P>
          </>
        ),
      },
      {
        id: "free",
        title: "無料で使えるもの",
        body: (
          <P>
            購入しなくても、iOSアプリでは「インテリアデザイン」の分析とそのアイデアのうち5つを読めます。アプリのそのほかの分析とアイデアにはinApp
            Plusが必要です。
          </P>
        ),
      },
      {
        id: "content",
        title: "コンテンツについて",
        body: (
          <>
            <P>
              inAppのコンテンツは、アプリストアで公開されているレビューを情報提供のために分析したものです。レビューの引用は、要約されていたり、元の言語から翻訳されていたりすることがあります。コンテンツは編集部による解釈であり、専門的、法的、財務的、投資上の助言ではありません。また、利用によって何らかの結果を保証するものでもありません。コンテンツにもとづく判断は、ご自身で行ってください。
            </P>
            <P>
              第三者のアプリや企業の名称と商標は、それぞれの権利者に帰属し、取り上げたアプリを示すためだけに使用しています。inAppはそれらの企業と提携しておらず、承認や支援も受けていません。
            </P>
          </>
        ),
      },
      {
        id: "use",
        title: "利用上のルール",
        body: (
          <>
            <P>inAppは、個人的な目的や、自社の社内業務のために利用できます。次のことは行わないでください。</P>
            <UL
              items={[
                "inAppのコンテンツを転売、再公開、再配布すること、または大量に複製すること",
                "当方がそのために提供するインターフェース以外の自動化された手段で、アプリやウェブサイトからコンテンツをダウンロードすること",
                "購入の確認やその他の技術的な制限を回避すること",
                "法律またはApple EULAで認められる場合を除き、アプリをリバースエンジニアリングすること",
                "適用される法律に違反して本サービスを利用すること",
              ]}
            />
          </>
        ),
      },
      {
        id: "ip",
        title: "知的財産",
        body: (
          <P>
            inAppのアプリ、ウェブサイト、デザイン、分析の本文、アイデア、イラスト、編集物は知的財産法によって保護されており、当方またはライセンサーに帰属します。レビューの引用はそれぞれの著者に帰属し、分析と論評に必要な範囲で使用しています。本規約（iOSアプリについてはApple
            EULAも含む）にもとづいて本サービスを利用する限定的な権利を除き、いかなる権利も移転されません。
          </P>
        ),
      },
      {
        id: "privacy",
        title: "プライバシー",
        body: (
          <>
            <P>iOSアプリがデータをどう扱うかは、{privacy}に記載しています。要点は次のとおりです。</P>
            <UL
              items={[
                "アカウントは任意です。アカウントなしなら、アプリは名前、メールアドレス、その他の連絡先をたずねません。サインインした場合は、選んだサインイン方法から共有される名前とメールアドレスを保存します（「Appleでサインイン」ではメールアドレスを非公開にできます）",
                "アカウントなしでは、メモとブックマークは端末にだけ保存されます。サインインすると、端末間で同期するために当方のサーバー上のアカウントにも保存されます",
                "支払いはAppleが処理し、アプリが受け取るのはアクセスに関する情報だけです",
                "購入とサブスクリプションの統計はRevenueCatが処理し、ランダムなインストール識別子（サインイン後はinAppアカウントのID）を使います",
                "広告目的の追跡は行いません",
              ]}
            />
          </>
        ),
      },
      {
        id: "removal",
        title: "引用の削除と著作権",
        body: (
          <P>
            inAppで引用されたレビューを書いた方、またはinAppの資料が自分の権利を侵害していると考える方は、分析の名前またはリンク、該当する引用、ご要望を添えて{mail}
            までご連絡ください。内容を確認し、必要に応じて資料を削除または修正します。
          </P>
        ),
      },
      {
        id: "liability",
        title: "責任の制限",
        body: (
          <P>
            本サービスは「現状のまま」かつ「提供可能な範囲で」提供されます。適用される法律で認められる最大限の範囲で、当方は、本サービスやそのコンテンツの利用または利用できないことから生じた間接的または派生的な損害、逸失利益、データの消失について責任を負いません。また、当方の責任の総額は、請求の前12か月間に本サービスに対して支払われた金額を上限とします。本規約は、強行法規にもとづいて消費者として持つ権利を制限するものではありません。
          </P>
        ),
      },
      {
        id: "changes",
        title: "本規約の変更",
        body: (
          <P>
            当方は本規約を更新することがあります。最新の版とその発効日は、常にこのページに掲載します。更新の発効後も本サービスを利用し続けた場合は、更新後の規約が適用されます。
          </P>
        ),
      },
      {
        id: "contact",
        title: "お問い合わせ",
        body: (
          <P>
            本規約や本サービスに関するご質問：{mail}。アプリに関するヘルプ：{support}。
          </P>
        ),
      },
    ],
  };
}
