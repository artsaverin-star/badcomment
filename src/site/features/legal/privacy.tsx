import type { ReactNode } from "react";
import { APP_DEVELOPER, SUPPORT_EMAIL } from "@/site/config";
import type { Locale } from "@/site/i18n/locales";
import { IOS_PRIVACY_URL } from "@/lib/legalPages";
import { Ext, MailLink, P, UL } from "./components";

// Privacy notice of the WEBSITE inapp.pro — /<L>/privacy (spec 09 C3, G4, O6). Layout = the
// app's privacy sheet (hero + cards); the text describes only what this site's code does:
//   • sign-in: Telegram (id, username, first name), Google (account id, e-mail, name),
//     e-mail magic link (address; sent through Yandex Cloud Postbox) → User row + ia_session;
//   • saved items / notes: localStorage (ia2:*) for guests, SiteSaved/SiteNote when signed in;
//   • payments: YooKassa hosted page, PaymentAttempt rows (amount, method, status, ids);
//   • analytics: Yandex Metrica (Webvisor, click map), Google Analytics 4, DataFast, and the
//     signed-in page log (/api/track → PageView);
//   • cookies: ia_session, locale, ia_theme, ia_app_banner, g_oauth_state/g_oauth_return, el_rl.
// The iOS app has its own policy (IOS_PRIVACY_URL). OWNER REVIEW REQUIRED before relying on it.

export type PrivacyDoc = {
  heroTitle: string;
  heroSub: string;
  cards: Array<{ id: string; title: string; body: ReactNode }>;
  contactLabel: string;
  iosLabel: string;
  updated: string;
};

const code = (s: string) => <code>{s}</code>;

export function privacyDoc(locale: Locale): PrivacyDoc {
  const mail = <MailLink email={SUPPORT_EMAIL} />;
  const ios = (label: string) => <Ext href={IOS_PRIVACY_URL}>{label}</Ext>;
  const dev = APP_DEVELOPER.name;
  switch (locale) {
    case "ru":
      return {
        heroTitle: "Твои идеи\nостаются твоими.",
        heroSub: "Как сайт inapp.pro хранит и использует данные.",
        cards: [
          {
            id: "scope",
            title: "Об этом документе",
            body: (
              <>
                <P>
                  Здесь описано, какие данные обрабатывает сайт inapp.pro. Сайт ведёт {dev}, разработчик inApp. Вопросы о
                  данных — на {mail}.
                </P>
                <P>У iOS-приложения inApp отдельная {ios("политика конфиденциальности")}.</P>
              </>
            ),
          },
          {
            id: "guest",
            title: "Без входа",
            body: (
              <P>
                Читать сайт можно без аккаунта. Тогда закладки и заметки хранятся только в этом браузере (localStorage)
                и не отправляются на наш сервер. Имя, почта и телефон не нужны.
              </P>
            ),
          },
          {
            id: "account",
            title: "Аккаунт и вход",
            body: (
              <>
                <P>Войти можно через Telegram, Google или по ссылке на почту. В аккаунте мы храним:</P>
                <UL
                  items={[
                    "Telegram — идентификатор пользователя, имя пользователя и имя;",
                    "Google — идентификатор аккаунта Google, адрес почты и имя;",
                    "почта — адрес, на который пришла ссылка для входа (письмо отправляется через Yandex Cloud Postbox);",
                    "дату создания аккаунта и статус доступа Plus.",
                  ]}
                />
                <P>
                  Вход держится с помощью cookie {code("ia_session")} (30 дней). Пароли мы не храним.
                </P>
              </>
            ),
          },
          {
            id: "saved",
            title: "Закладки и заметки",
            body: (
              <P>
                После входа закладки и заметки хранятся в твоём аккаунте на нашем сервере, чтобы они были на всех твоих
                устройствах; записи из браузера один раз объединяются с аккаунтом. Их видишь только ты. Удаление
                закладки не удаляет заметку.
              </P>
            ),
          },
          {
            id: "payments",
            title: "Покупки",
            body: (
              <P>
                Оплату на сайте обрабатывает ЮKassa (ООО НКО «ЮМани»): данные карты или СБП вводятся на странице ЮKassa
                и нам недоступны. Мы храним, какой аккаунт оплатил, сумму, способ оплаты, статус и номер платежа в
                ЮKassa — чтобы открыть доступ и отвечать на вопросы об оплате. Покупки в iOS-приложении обрабатывает
                Apple.
              </P>
            ),
          },
          {
            id: "analytics",
            title: "Аналитика",
            body: (
              <>
                <P>
                  Чтобы понимать, какие материалы читают, мы используем Яндекс Метрику (с Вебвизором и картой кликов —
                  они записывают действия на странице), Google Analytics и DataFast. Они получают адреса открытых
                  страниц, клики, данные о браузере и устройстве, примерное местоположение и ставят свои cookies.
                </P>
                <P>
                  Для вошедших пользователей сервер также записывает, какие страницы открывались в аккаунте (адрес и
                  заголовок страницы). Рекламы на сайте нет, данные мы не продаём.
                </P>
              </>
            ),
          },
          {
            id: "cookies",
            title: "Cookies и хранилище браузера",
            body: (
              <UL
                items={[
                  <>{code("ia_session")} — вход в аккаунт, 30 дней;</>,
                  <>{code("locale")} и {code("ia_theme")} — язык и оформление, 1 год;</>,
                  <>{code("ia_app_banner")} — скрытый баннер «Открыть в приложении», 180 дней;</>,
                  <>
                    {code("g_oauth_state")}, {code("g_oauth_return")} — вход через Google, 10 минут; {code("el_rl")} —
                    ограничение числа писем для входа, 1 день;
                  </>,
                  <>
                    localStorage {code("ia2:saved.ideas")}, {code("ia2:saved.research")}, {code("ia2:notes")} — закладки
                    и заметки; sessionStorage {code("ia2:tabs")} — последняя страница в каждой вкладке;
                  </>,
                  "cookies Яндекс Метрики и Google Analytics.",
                ]}
              />
            ),
          },
          {
            id: "delete",
            title: "Удаление данных",
            body: (
              <P>
                Закладки и заметки гостя удаляются вместе с данными сайта в настройках браузера. Чтобы удалить
                аккаунт вместе с закладками, заметками и историей просмотров, напиши на {mail} и укажи, как ты входишь
                (Telegram, Google или почта). Записи о платежах мы можем хранить, пока этого требует закон.
              </P>
            ),
          },
        ],
        contactLabel: "Связаться с разработчиком",
        iosLabel: "Политика конфиденциальности iOS-приложения",
        updated: "Обновлено 22 сентября 2026 года",
      };
    case "de":
      return {
        heroTitle: "Deine Ideen\nbleiben deine.",
        heroSub: "Wie die Website inapp.pro Daten speichert und verwendet.",
        cards: [
          {
            id: "scope",
            title: "Über dieses Dokument",
            body: (
              <>
                <P>
                  Hier steht, welche Daten die Website inapp.pro verarbeitet. Betrieben wird sie von {dev}, dem
                  Entwickler von inApp. Fragen zu Daten: {mail}.
                </P>
                <P>Für die iOS-App inApp gilt eine eigene {ios("Datenschutzerklärung")}.</P>
              </>
            ),
          },
          {
            id: "guest",
            title: "Ohne Anmeldung",
            body: (
              <P>
                Du kannst die Website ohne Konto lesen. Lesezeichen und Notizen bleiben dann nur in diesem Browser
                (localStorage) und werden nicht an unseren Server gesendet. Name, E-Mail oder Telefonnummer brauchst du
                nicht.
              </P>
            ),
          },
          {
            id: "account",
            title: "Konto und Anmeldung",
            body: (
              <>
                <P>Du kannst dich über Telegram, Google oder einen Link per E-Mail anmelden. Im Konto speichern wir:</P>
                <UL
                  items={[
                    "Telegram – Nutzer-ID, Benutzername und Vorname;",
                    "Google – Google-Konto-ID, E-Mail-Adresse und Name;",
                    "E-Mail – die Adresse, an die der Anmeldelink ging (die Mail wird über Yandex Cloud Postbox verschickt);",
                    "das Erstellungsdatum des Kontos und den Plus-Status.",
                  ]}
                />
                <P>Die Anmeldung bleibt über das Cookie {code("ia_session")} (30 Tage) bestehen. Passwörter speichern wir nicht.</P>
              </>
            ),
          },
          {
            id: "saved",
            title: "Lesezeichen und Notizen",
            body: (
              <P>
                Nach der Anmeldung liegen Lesezeichen und Notizen in deinem Konto auf unserem Server, damit du sie auf
                all deinen Geräten hast; die Einträge aus dem Browser werden einmal mit dem Konto zusammengeführt. Nur du
                siehst sie. Ein entferntes Lesezeichen löscht die Notiz nicht.
              </P>
            ),
          },
          {
            id: "payments",
            title: "Käufe",
            body: (
              <P>
                Zahlungen auf der Website wickelt YooKassa (NKO YooMoney LLC) ab: Karten- oder SBP-Daten gibst du auf der
                Seite von YooKassa ein, sie sind für uns nicht zugänglich. Wir speichern, welches Konto bezahlt hat, den
                Betrag, die Zahlungsart, den Status und die Zahlungsnummer bei YooKassa – um den Zugang freizuschalten und
                Fragen zur Zahlung zu beantworten. Käufe in der iOS-App wickelt Apple ab.
              </P>
            ),
          },
          {
            id: "analytics",
            title: "Analyse",
            body: (
              <>
                <P>
                  Um zu verstehen, welche Materialien gelesen werden, nutzen wir Yandex Metrica (mit Webvisor und
                  Klickkarte – sie zeichnen Aktionen auf der Seite auf), Google Analytics und DataFast. Sie erhalten die
                  Adressen der geöffneten Seiten, Klicks, Browser- und Gerätedaten sowie den ungefähren Standort und
                  setzen eigene Cookies.
                </P>
                <P>
                  Bei angemeldeten Nutzern speichert der Server außerdem, welche Seiten im Konto geöffnet wurden (Adresse
                  und Titel der Seite). Auf der Website gibt es keine Werbung, und wir verkaufen keine Daten.
                </P>
              </>
            ),
          },
          {
            id: "cookies",
            title: "Cookies und Browserspeicher",
            body: (
              <UL
                items={[
                  <>{code("ia_session")} – Anmeldung, 30 Tage;</>,
                  <>{code("locale")} und {code("ia_theme")} – Sprache und Darstellung, 1 Jahr;</>,
                  <>{code("ia_app_banner")} – ausgeblendetes Banner „In der App öffnen“, 180 Tage;</>,
                  <>
                    {code("g_oauth_state")}, {code("g_oauth_return")} – Anmeldung mit Google, 10 Minuten; {code("el_rl")} –
                    Begrenzung der Anmelde-Mails, 1 Tag;
                  </>,
                  <>
                    localStorage {code("ia2:saved.ideas")}, {code("ia2:saved.research")}, {code("ia2:notes")} –
                    Lesezeichen und Notizen; sessionStorage {code("ia2:tabs")} – die letzte Seite in jedem Tab;
                  </>,
                  "Cookies von Yandex Metrica und Google Analytics.",
                ]}
              />
            ),
          },
          {
            id: "delete",
            title: "Daten löschen",
            body: (
              <P>
                Lesezeichen und Notizen ohne Konto verschwinden, wenn du die Websitedaten in den Browsereinstellungen
                löschst. Um dein Konto samt Lesezeichen, Notizen und Seitenverlauf zu löschen, schreib an {mail} und gib
                an, wie du dich anmeldest (Telegram, Google oder E-Mail). Zahlungsdaten dürfen wir aufbewahren, solange
                das Gesetz es verlangt.
              </P>
            ),
          },
        ],
        contactLabel: "Kontakt zum Entwickler",
        iosLabel: "Datenschutzerklärung der iOS-App",
        updated: "Aktualisiert am 22. September 2026",
      };
    case "fr":
      return {
        heroTitle: "Tes idées\nrestent les tiennes.",
        heroSub: "Comment le site inapp.pro conserve et utilise les données.",
        cards: [
          {
            id: "scope",
            title: "À propos de ce document",
            body: (
              <>
                <P>
                  Ce document décrit les données que traite le site inapp.pro. Le site est exploité par {dev}, le
                  développeur d’inApp. Questions sur les données : {mail}.
                </P>
                <P>L’app iOS inApp a sa propre {ios("politique de confidentialité")}.</P>
              </>
            ),
          },
          {
            id: "guest",
            title: "Sans connexion",
            body: (
              <P>
                Tu peux lire le site sans compte. Tes signets et tes notes restent alors uniquement dans ce navigateur
                (localStorage) et ne sont pas envoyés à notre serveur. Ni nom, ni e-mail, ni téléphone ne sont
                nécessaires.
              </P>
            ),
          },
          {
            id: "account",
            title: "Compte et connexion",
            body: (
              <>
                <P>Tu peux te connecter via Telegram, Google ou un lien envoyé par e-mail. Dans le compte, nous conservons :</P>
                <UL
                  items={[
                    "Telegram — l’identifiant utilisateur, le nom d’utilisateur et le prénom ;",
                    "Google — l’identifiant du compte Google, l’adresse e-mail et le nom ;",
                    "e-mail — l’adresse à laquelle le lien de connexion a été envoyé (l’e-mail passe par Yandex Cloud Postbox) ;",
                    "la date de création du compte et le statut d’accès Plus.",
                  ]}
                />
                <P>La connexion est maintenue par le cookie {code("ia_session")} (30 jours). Nous ne conservons aucun mot de passe.</P>
              </>
            ),
          },
          {
            id: "saved",
            title: "Signets et notes",
            body: (
              <P>
                Une fois connecté, tes signets et tes notes sont conservés dans ton compte sur notre serveur, pour être
                disponibles sur tous tes appareils ; les entrées du navigateur sont fusionnées une fois avec le compte.
                Toi seul les vois. Retirer un signet ne supprime pas la note.
              </P>
            ),
          },
          {
            id: "payments",
            title: "Achats",
            body: (
              <P>
                Les paiements sur le site sont traités par YooKassa (NKO YooMoney) : les données de carte ou de SBP sont
                saisies sur la page de YooKassa et ne nous sont pas accessibles. Nous conservons le compte qui a payé, le
                montant, le moyen de paiement, le statut et le numéro du paiement chez YooKassa — pour ouvrir l’accès et
                répondre aux questions sur le paiement. Les achats dans l’app iOS sont traités par Apple.
              </P>
            ),
          },
          {
            id: "analytics",
            title: "Statistiques",
            body: (
              <>
                <P>
                  Pour comprendre quels contenus sont lus, nous utilisons Yandex Metrica (avec Webvisor et la carte des
                  clics, qui enregistrent les actions sur la page), Google Analytics et DataFast. Ils reçoivent les
                  adresses des pages ouvertes, les clics, des données sur le navigateur et l’appareil, une localisation
                  approximative, et déposent leurs propres cookies.
                </P>
                <P>
                  Pour les utilisateurs connectés, le serveur enregistre aussi les pages ouvertes avec le compte (adresse
                  et titre de la page). Il n’y a pas de publicité sur le site et nous ne vendons pas de données.
                </P>
              </>
            ),
          },
          {
            id: "cookies",
            title: "Cookies et stockage du navigateur",
            body: (
              <UL
                items={[
                  <>{code("ia_session")} — connexion au compte, 30 jours ;</>,
                  <>{code("locale")} et {code("ia_theme")} — langue et apparence, 1 an ;</>,
                  <>{code("ia_app_banner")} — bandeau « Ouvrir dans l’app » masqué, 180 jours ;</>,
                  <>
                    {code("g_oauth_state")}, {code("g_oauth_return")} — connexion avec Google, 10 minutes ; {code("el_rl")}{" "}
                    — limite des e-mails de connexion, 1 jour ;
                  </>,
                  <>
                    localStorage {code("ia2:saved.ideas")}, {code("ia2:saved.research")}, {code("ia2:notes")} — signets
                    et notes ; sessionStorage {code("ia2:tabs")} — la dernière page de chaque onglet ;
                  </>,
                  "les cookies de Yandex Metrica et de Google Analytics.",
                ]}
              />
            ),
          },
          {
            id: "delete",
            title: "Suppression des données",
            body: (
              <P>
                Sans compte, les signets et les notes disparaissent avec les données du site dans les réglages du
                navigateur. Pour supprimer ton compte avec ses signets, ses notes et son historique de pages, écris à{" "}
                {mail} en précisant comment tu te connectes (Telegram, Google ou e-mail). Nous pouvons conserver les
                données de paiement tant que la loi l’exige.
              </P>
            ),
          },
        ],
        contactLabel: "Contacter le développeur",
        iosLabel: "Politique de confidentialité de l’app iOS",
        updated: "Mis à jour le 22 septembre 2026",
      };
    case "ja":
      return {
        heroTitle: "あなたのアイデアは\nあなたのもの。",
        heroSub: "ウェブサイトinapp.proがデータをどう保存し、どう使うか。",
        cards: [
          {
            id: "scope",
            title: "この文書について",
            body: (
              <>
                <P>
                  ここでは、ウェブサイトinapp.proが扱うデータについて説明します。サイトはinAppの開発者である{dev}
                  が運営しています。データに関するご質問は{mail}までお送りください。
                </P>
                <P>iOSアプリ「inApp」には別の{ios("プライバシーポリシー")}があります。</P>
              </>
            ),
          },
          {
            id: "guest",
            title: "ログインしない場合",
            body: (
              <P>
                サイトはアカウントなしで読めます。その場合、ブックマークとメモはこのブラウザ（localStorage）にだけ保存され、当方のサーバーには送信されません。名前、メールアドレス、電話番号は必要ありません。
              </P>
            ),
          },
          {
            id: "account",
            title: "アカウントとログイン",
            body: (
              <>
                <P>ログインにはTelegram、Google、メールで届くリンクを使えます。アカウントには次の情報を保存します。</P>
                <UL
                  items={[
                    "Telegram：ユーザーID、ユーザー名、名前",
                    "Google：GoogleアカウントのID、メールアドレス、名前",
                    "メール：ログイン用リンクを送ったアドレス（メールはYandex Cloud Postboxを通じて送信されます）",
                    "アカウントの作成日とPlusのアクセス状況",
                  ]}
                />
                <P>ログイン状態はCookie {code("ia_session")}（30日間）で保たれます。パスワードは保存しません。</P>
              </>
            ),
          },
          {
            id: "saved",
            title: "ブックマークとメモ",
            body: (
              <P>
                ログインすると、ブックマークとメモは当方のサーバー上のあなたのアカウントに保存され、どの端末からでも使えます。ブラウザに保存されていた記録は、一度だけアカウントに統合されます。見られるのはあなただけです。ブックマークを外してもメモは消えません。
              </P>
            ),
          },
          {
            id: "payments",
            title: "購入",
            body: (
              <P>
                サイトでの支払いはYooKassa（NKO YooMoney）が処理します。カードやSBPの情報はYooKassaのページで入力され、当方からは見えません。当方が保存するのは、支払ったアカウント、金額、支払い方法、状況、YooKassaでの支払い番号です。アクセスを開放し、支払いに関するご質問に答えるために使います。iOSアプリでの購入はAppleが処理します。
              </P>
            ),
          },
          {
            id: "analytics",
            title: "アナリティクス",
            body: (
              <>
                <P>
                  どの資料が読まれているかを知るために、Yandex Metrica（ページ上の操作を記録するWebvisorとクリックマップを含む）、Google
                  Analytics、DataFastを使っています。これらのサービスは、開いたページのアドレス、クリック、ブラウザと端末の情報、おおよその位置を受け取り、独自のCookieを設定します。
                </P>
                <P>
                  ログインしているユーザーについては、アカウントで開いたページ（アドレスとページのタイトル）もサーバーに記録します。サイトに広告はなく、データを販売することもありません。
                </P>
              </>
            ),
          },
          {
            id: "cookies",
            title: "Cookieとブラウザのストレージ",
            body: (
              <UL
                items={[
                  <>{code("ia_session")}：アカウントへのログイン、30日間</>,
                  <>{code("locale")}と{code("ia_theme")}：言語と外観、1年間</>,
                  <>{code("ia_app_banner")}：非表示にした「アプリで開く」バナー、180日間</>,
                  <>
                    {code("g_oauth_state")}、{code("g_oauth_return")}：Googleでのログイン、10分間。{code("el_rl")}
                    ：ログイン用メールの回数制限、1日間
                  </>,
                  <>
                    localStorageの{code("ia2:saved.ideas")}、{code("ia2:saved.research")}、{code("ia2:notes")}
                    ：ブックマークとメモ。sessionStorageの{code("ia2:tabs")}：各タブで最後に開いたページ
                  </>,
                  "Yandex MetricaとGoogle AnalyticsのCookie",
                ]}
              />
            ),
          },
          {
            id: "delete",
            title: "データの削除",
            body: (
              <P>
                ログインしていない場合のブックマークとメモは、ブラウザの設定でサイトのデータを消すと削除されます。ブックマーク、メモ、閲覧履歴を含めてアカウントを削除したいときは、ログイン方法（Telegram、Google、メール）を添えて{mail}
                までご連絡ください。支払いの記録は、法律で求められる期間保存することがあります。
              </P>
            ),
          },
        ],
        contactLabel: "開発者に連絡する",
        iosLabel: "iOSアプリのプライバシーポリシー",
        updated: "2026年9月22日更新",
      };
    default:
      return {
        heroTitle: "Your ideas\nstay yours.",
        heroSub: "How the inapp.pro website stores and uses data.",
        cards: [
          {
            id: "scope",
            title: "About this notice",
            body: (
              <>
                <P>
                  This notice describes the data the inapp.pro website processes. The website is run by {dev}, the
                  developer of inApp. Questions about your data: {mail}.
                </P>
                <P>The inApp iOS app has its own {ios("privacy policy")}.</P>
              </>
            ),
          },
          {
            id: "guest",
            title: "Without signing in",
            body: (
              <P>
                You can read the website without an account. Your bookmarks and notes then stay only in this browser
                (localStorage) and are not sent to our server. No name, e-mail or phone number is needed.
              </P>
            ),
          },
          {
            id: "account",
            title: "Account and sign-in",
            body: (
              <>
                <P>You can sign in with Telegram, Google or a link sent by e-mail. In your account we keep:</P>
                <UL
                  items={[
                    "Telegram — your user ID, username and first name;",
                    "Google — your Google account ID, e-mail address and name;",
                    "e-mail — the address the sign-in link was sent to (the e-mail goes out through Yandex Cloud Postbox);",
                    "when the account was created and your Plus access status.",
                  ]}
                />
                <P>You stay signed in through the {code("ia_session")} cookie (30 days). We do not store passwords.</P>
              </>
            ),
          },
          {
            id: "saved",
            title: "Bookmarks and notes",
            body: (
              <P>
                Once you sign in, your bookmarks and notes are kept in your account on our server so they are on all
                your devices; the entries from this browser are merged into the account once. Only you can see them.
                Removing a bookmark does not delete the note.
              </P>
            ),
          },
          {
            id: "payments",
            title: "Purchases",
            body: (
              <P>
                Payments on the website are processed by YooKassa (NKO YooMoney LLC): card or SBP details are entered on
                YooKassa’s page and are not available to us. We keep which account paid, the amount, the payment method,
                the status and YooKassa’s payment number — to grant access and to answer questions about the payment.
                Purchases in the iOS app are handled by Apple.
              </P>
            ),
          },
          {
            id: "analytics",
            title: "Analytics",
            body: (
              <>
                <P>
                  To understand which materials people read, we use Yandex Metrica (with Webvisor and the click map,
                  which record actions on the page), Google Analytics and DataFast. They receive the addresses of the
                  pages you open, clicks, browser and device data and an approximate location, and they set their own
                  cookies.
                </P>
                <P>
                  For signed-in users the server also records which pages were opened in the account (page address and
                  title). There are no ads on the website, and we do not sell data.
                </P>
              </>
            ),
          },
          {
            id: "cookies",
            title: "Cookies and browser storage",
            body: (
              <UL
                items={[
                  <>{code("ia_session")} — signing in, 30 days;</>,
                  <>{code("locale")} and {code("ia_theme")} — language and appearance, 1 year;</>,
                  <>{code("ia_app_banner")} — the hidden “Open in the app” banner, 180 days;</>,
                  <>
                    {code("g_oauth_state")}, {code("g_oauth_return")} — Google sign-in, 10 minutes; {code("el_rl")} —
                    limit on sign-in e-mails, 1 day;
                  </>,
                  <>
                    localStorage {code("ia2:saved.ideas")}, {code("ia2:saved.research")}, {code("ia2:notes")} —
                    bookmarks and notes; sessionStorage {code("ia2:tabs")} — the last page of each tab;
                  </>,
                  "Yandex Metrica and Google Analytics cookies.",
                ]}
              />
            ),
          },
          {
            id: "delete",
            title: "Deleting data",
            body: (
              <P>
                Without an account, bookmarks and notes are deleted together with the site data in your browser
                settings. To delete your account with its bookmarks, notes and page history, e-mail {mail} and tell us
                how you sign in (Telegram, Google or e-mail). We may keep payment records for as long as the law
                requires.
              </P>
            ),
          },
        ],
        contactLabel: "Contact the developer",
        iosLabel: "iOS app privacy policy",
        updated: "Updated September 22, 2026",
      };
  }
}
