import Link from "next/link";
import type { ReactNode } from "react";
import { APP_DEVELOPER, SUPPORT_EMAIL } from "@/site/config";
import type { Locale } from "@/site/i18n/locales";
import { routes } from "@/site/routing";
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
//   • cookies: ia_session, locale, ia_theme, ia_app_banner, g_oauth_state/g_oauth_return, el_rl;
//   • sessionStorage: ia2:tabs (last page per tab), ia2:pulse.feed (the «Пульс» cards loaded by
//     scrolling and the position, for Back; 30 minutes — src/site/features/pulse/PulseFeed.tsx);
//   • the iOS app's account (docs/site-v2/APP-ACCOUNTS.md): Sign in with Apple (User.appleId,
//     e-mail/name if shared, encrypted Apple refresh token for revocation), the website → app
//     hand-off code (AppLoginCode, 5 min, single use), app sessions (AppSession: token hash,
//     created/last used), User.appLinkedAt; bookmarks/notes synced between the app
//     and the site; RevenueCat entitlement lookup by account id (appPlusUntil/appLifetime/
//     appCheckedAt); account deletion in Settings (site and app, src/lib/appAccount.ts): Apple
//     token revoked when configured, the User row and everything tied to it (incl. PaymentAttempt) go.
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
  const settings = (label: string) => (
    <Link href={routes.settings(locale)} className="ia-legal-link">
      {label}
    </Link>
  );
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
                <P>
                  Войти можно через Telegram, Google или по ссылке на почту, а в iOS-приложении inApp — ещё и через Apple.
                  В аккаунте мы храним:
                </P>
                <UL
                  items={[
                    "Apple — идентификатор «Вход с Apple», почту и имя, если ты разрешил их передать (почта может быть скрытым адресом Apple), и зашифрованный токен Apple — он нужен, чтобы отозвать вход при удалении аккаунта;",
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
            id: "app",
            title: "Вход в iOS-приложении",
            body: (
              <>
                <P>
                  В приложении inApp можно войти в тот же аккаунт: через Apple или через этот сайт (Telegram, Google,
                  почта). Во втором случае сайт передаёт приложению одноразовый код — он действует 5 минут и срабатывает
                  один раз.
                </P>
                <P>
                  После входа приложение хранит ключ сессии в Связке ключей iPhone. На сервере мы храним только хеш этого
                  ключа, время входа и последнего обращения, а в аккаунте — дату первого входа в приложении. Ключ
                  действует, пока ты не выйдешь из аккаунта в приложении или не удалишь аккаунт.
                </P>
              </>
            ),
          },
          {
            id: "saved",
            title: "Закладки и заметки",
            body: (
              <>
                <P>
                  После входа закладки и заметки хранятся в твоём аккаунте на нашем сервере, чтобы они были на всех твоих
                  устройствах; записи из браузера один раз объединяются с аккаунтом. Их видишь только ты. Удаление
                  закладки не удаляет заметку.
                </P>
                <P>
                  Если ты вошёл в тот же аккаунт в приложении inApp, закладки и заметки синхронизируются между
                  приложением и сайтом: при входе записи из приложения один раз объединяются с аккаунтом, дальше
                  изменения передаются в обе стороны.
                </P>
              </>
            ),
          },
          {
            id: "payments",
            title: "Покупки",
            body: (
              <>
                <P>
                  Оплату на сайте обрабатывает ЮKassa (ООО НКО «ЮМани»): данные карты или СБП вводятся на странице ЮKassa
                  и нам недоступны. Мы храним, какой аккаунт оплатил, сумму, способ оплаты, статус и номер платежа в
                  ЮKassa — чтобы открыть доступ и отвечать на вопросы об оплате.
                </P>
                <P>
                  Покупки в iOS-приложении обрабатывает Apple, а подписку проверяет сервис RevenueCat. Если ты вошёл в
                  аккаунт в приложении, приложение передаёт RevenueCat идентификатор аккаунта, а наш сервер по нему
                  запрашивает у RevenueCat, активна ли подписка inApp Plus, и хранит ответ в аккаунте (активна ли, до
                  какой даты, бессрочная ли, когда проверено) — чтобы Plus работал в аккаунте и на сайте. Данные карты
                  Apple и RevenueCat нам не передают.
                </P>
              </>
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
                    и заметки; sessionStorage {code("ia2:tabs")} — последняя страница в каждой вкладке, {code("ia2:pulse.feed")} —
                    подгруженные карточки «Пульса» и место в ленте для возврата «Назад», 30 минут;
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
              <>
                <P>
                  Закладки и заметки гостя удаляются вместе с данными сайта в настройках браузера.
                </P>
                <P>
                  Аккаунт можно удалить в {settings("настройках сайта")} («Удалить аккаунт») или в настройках приложения
                  inApp. Вместе с ним удаляются закладки, заметки, история просмотров, записи о платежах и все входы в
                  приложении. Если ты
                  входил через Apple, при удалении мы отзываем токен Apple, когда это технически возможно; отключить inApp
                  можно и самому — в настройках Apple ID на iPhone, раздел «Вход с Apple».
                </P>
                <P>
                  Если удалить аккаунт не получается, напиши на {mail} и укажи, как ты входишь (Apple, Telegram, Google
                  или почта). ЮKassa и Apple хранят сведения о платежах по своим правилам.
                </P>
              </>
            ),
          },
        ],
        contactLabel: "Связаться с разработчиком",
        iosLabel: "Политика конфиденциальности iOS-приложения",
        updated: "Обновлено 26 сентября 2026 года",
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
                <P>
                  Du kannst dich über Telegram, Google oder einen Link per E-Mail anmelden, in der iOS-App inApp auch mit
                  Apple. Im Konto speichern wir:
                </P>
                <UL
                  items={[
                    "Apple – die ID von „Mit Apple anmelden“, E-Mail-Adresse und Name, falls du sie freigibst (die Adresse kann eine private Apple-Weiterleitungsadresse sein), und ein verschlüsseltes Apple-Token, mit dem wir die Anmeldung beim Löschen des Kontos widerrufen;",
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
            id: "app",
            title: "Anmeldung in der iOS-App",
            body: (
              <>
                <P>
                  In der App inApp kannst du dich mit demselben Konto anmelden: mit Apple oder über diese Website
                  (Telegram, Google, E-Mail). Im zweiten Fall übergibt die Website der App einen Einmalcode, der 5 Minuten
                  gültig ist und nur einmal funktioniert.
                </P>
                <P>
                  Nach der Anmeldung bewahrt die App einen Sitzungsschlüssel im iPhone-Schlüsselbund auf. Auf dem Server
                  speichern wir nur einen Hash dieses Schlüssels und den Zeitpunkt der Anmeldung und der letzten Nutzung,
                  im Konto außerdem das Datum der ersten Anmeldung in der App. Der Schlüssel gilt, bis du dich in der App
                  abmeldest oder dein Konto löschst.
                </P>
              </>
            ),
          },
          {
            id: "saved",
            title: "Lesezeichen und Notizen",
            body: (
              <>
                <P>
                  Nach der Anmeldung liegen Lesezeichen und Notizen in deinem Konto auf unserem Server, damit du sie auf
                  all deinen Geräten hast; die Einträge aus dem Browser werden einmal mit dem Konto zusammengeführt. Nur
                  du siehst sie. Ein entferntes Lesezeichen löscht die Notiz nicht.
                </P>
                <P>
                  Wenn du dich in der App inApp mit demselben Konto anmeldest, werden Lesezeichen und Notizen zwischen App
                  und Website synchronisiert: Bei der Anmeldung werden die Einträge aus der App einmal mit dem Konto
                  zusammengeführt, danach gehen Änderungen in beide Richtungen.
                </P>
              </>
            ),
          },
          {
            id: "payments",
            title: "Käufe",
            body: (
              <>
                <P>
                  Zahlungen auf der Website wickelt YooKassa (NKO YooMoney LLC) ab: Karten- oder SBP-Daten gibst du auf
                  der Seite von YooKassa ein, sie sind für uns nicht zugänglich. Wir speichern, welches Konto bezahlt hat,
                  den Betrag, die Zahlungsart, den Status und die Zahlungsnummer bei YooKassa – um den Zugang
                  freizuschalten und Fragen zur Zahlung zu beantworten.
                </P>
                <P>
                  Käufe in der iOS-App wickelt Apple ab, das Abo prüft der Dienst RevenueCat. Bist du in der App
                  angemeldet, übermittelt die App RevenueCat die ID deines Kontos, und unser Server fragt mit dieser ID bei
                  RevenueCat ab, ob dein inApp-Plus-Abo aktiv ist. Die Antwort speichern wir im Konto (aktiv oder nicht,
                  bis wann, unbefristet oder nicht, wann geprüft), damit Plus für dein Konto auch auf der Website gilt.
                  Kartendaten geben Apple und RevenueCat nicht an uns weiter.
                </P>
              </>
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
                    Lesezeichen und Notizen; sessionStorage {code("ia2:tabs")} – die letzte Seite in jedem Tab,{" "}
                    {code("ia2:pulse.feed")} – nachgeladene Karten im „Puls“ und die Stelle in der Liste für „Zurück“, 30
                    Minuten;
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
              <>
                <P>
                  Lesezeichen und Notizen ohne Konto verschwinden, wenn du die Websitedaten in den Browsereinstellungen
                  löschst.
                </P>
                <P>
                  Dein Konto kannst du in den {settings("Einstellungen der Website")} („Konto löschen“) oder in den
                  Einstellungen der App inApp löschen. Mit ihm werden Lesezeichen, Notizen, Seitenverlauf,
                  Zahlungseinträge und alle Anmeldungen in der App gelöscht. Hast du dich mit Apple angemeldet, widerrufen wir beim Löschen das
                  Apple-Token, soweit das technisch möglich ist; du kannst inApp auch selbst trennen – in den
                  Apple-ID-Einstellungen auf dem iPhone unter „Mit Apple anmelden“.
                </P>
                <P>
                  Klappt das Löschen nicht, schreib an {mail} und gib an, wie du dich anmeldest (Apple, Telegram, Google
                  oder E-Mail). YooKassa und Apple bewahren Zahlungsdaten nach ihren eigenen Regeln auf.
                </P>
              </>
            ),
          },
        ],
        contactLabel: "Kontakt zum Entwickler",
        iosLabel: "Datenschutzerklärung der iOS-App",
        updated: "Aktualisiert am 26. September 2026",
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
                <P>
                  Tu peux te connecter via Telegram, Google ou un lien envoyé par e-mail, et dans l’app iOS inApp aussi
                  avec Apple. Dans le compte, nous conservons :
                </P>
                <UL
                  items={[
                    "Apple — l’identifiant « Se connecter avec Apple », l’adresse e-mail et le nom si tu choisis de les partager (l’adresse peut être un relais privé d’Apple), et un jeton Apple chiffré qui sert à révoquer la connexion quand le compte est supprimé ;",
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
            id: "app",
            title: "Connexion dans l’app iOS",
            body: (
              <>
                <P>
                  Dans l’app inApp, tu peux te connecter au même compte : avec Apple ou via ce site (Telegram, Google,
                  e-mail). Dans le second cas, le site transmet à l’app un code à usage unique, valable 5 minutes.
                </P>
                <P>
                  Après la connexion, l’app garde une clé de session dans le trousseau de l’iPhone. Sur notre serveur,
                  nous ne conservons qu’une empreinte (hash) de cette clé et l’heure de connexion et de dernière
                  utilisation ; le compte garde aussi la date de la première connexion dans l’app. La clé reste valable
                  jusqu’à ce que tu te déconnectes dans l’app ou que tu supprimes le compte.
                </P>
              </>
            ),
          },
          {
            id: "saved",
            title: "Signets et notes",
            body: (
              <>
                <P>
                  Une fois connecté, tes signets et tes notes sont conservés dans ton compte sur notre serveur, pour être
                  disponibles sur tous tes appareils ; les entrées du navigateur sont fusionnées une fois avec le compte.
                  Toi seul les vois. Retirer un signet ne supprime pas la note.
                </P>
                <P>
                  Si tu te connectes au même compte dans l’app inApp, les signets et les notes se synchronisent entre
                  l’app et le site : à la connexion, les entrées de l’app sont fusionnées une fois avec le compte, puis
                  les modifications passent dans les deux sens.
                </P>
              </>
            ),
          },
          {
            id: "payments",
            title: "Achats",
            body: (
              <>
                <P>
                  Les paiements sur le site sont traités par YooKassa (NKO YooMoney) : les données de carte ou de SBP
                  sont saisies sur la page de YooKassa et ne nous sont pas accessibles. Nous conservons le compte qui a
                  payé, le montant, le moyen de paiement, le statut et le numéro du paiement chez YooKassa — pour ouvrir
                  l’accès et répondre aux questions sur le paiement.
                </P>
                <P>
                  Les achats dans l’app iOS sont traités par Apple, et l’abonnement est vérifié par le service
                  RevenueCat. Si tu es connecté dans l’app, l’app transmet à RevenueCat l’identifiant de ton compte, et
                  notre serveur demande à RevenueCat, avec cet identifiant, si ton abonnement inApp Plus est actif. Nous
                  gardons la réponse dans le compte (actif ou non, jusqu’à quand, à vie ou non, date de vérification)
                  pour que Plus fonctionne pour ton compte aussi sur le site. Apple et RevenueCat ne nous transmettent
                  pas de données de carte.
                </P>
              </>
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
                    et notes ; sessionStorage {code("ia2:tabs")} — la dernière page de chaque onglet, {code("ia2:pulse.feed")}{" "}
                    — les cartes chargées du « Pouls » et la position dans la liste pour le retour, 30 minutes ;
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
              <>
                <P>
                  Sans compte, les signets et les notes disparaissent avec les données du site dans les réglages du
                  navigateur.
                </P>
                <P>
                  Tu peux supprimer ton compte dans les {settings("réglages du site")} (« Supprimer le compte ») ou dans
                  les réglages de l’app inApp. Ses signets, ses notes, son historique de pages, ses enregistrements de
                  paiement et toutes les connexions de l’app sont supprimés avec lui. Si tu t’es connecté avec Apple, nous révoquons le jeton Apple lors de
                  la suppression quand c’est techniquement possible ; tu peux aussi retirer inApp toi-même dans les
                  réglages de ton identifiant Apple sur l’iPhone, rubrique « Se connecter avec Apple ».
                </P>
                <P>
                  Si la suppression ne marche pas, écris à {mail} en précisant comment tu te connectes (Apple, Telegram,
                  Google ou e-mail). YooKassa et Apple conservent les données de paiement selon leurs propres règles.
                </P>
              </>
            ),
          },
        ],
        contactLabel: "Contacter le développeur",
        iosLabel: "Politique de confidentialité de l’app iOS",
        updated: "Mis à jour le 26 septembre 2026",
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
                <P>
                  ログインにはTelegram、Google、メールで届くリンクを使えます。iOSアプリ「inApp」ではAppleでもログインできます。アカウントには次の情報を保存します。
                </P>
                <UL
                  items={[
                    "Apple：「Appleでサインイン」のID、共有を許可した場合のメールアドレスと名前（メールアドレスはAppleの非公開リレーアドレスの場合があります）、暗号化したAppleのトークン（アカウント削除時にサインインを取り消すために使います）",
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
            id: "app",
            title: "iOSアプリでのログイン",
            body: (
              <>
                <P>
                  アプリ「inApp」では、同じアカウントにAppleまたはこのサイト（Telegram、Google、メール）でログインできます。サイトを使う場合は、サイトからアプリに1回限りのコードを渡します。コードの有効期限は5分で、使えるのは1回だけです。
                </P>
                <P>
                  ログイン後、アプリはセッションキーをiPhoneのキーチェーンに保存します。当方のサーバーに保存するのは、このキーのハッシュと、ログインおよび最後に使われた日時だけです。アカウントには、アプリで初めてログインした日付も記録します。キーは、アプリでログアウトするかアカウントを削除するまで有効です。
                </P>
              </>
            ),
          },
          {
            id: "saved",
            title: "ブックマークとメモ",
            body: (
              <>
                <P>
                  ログインすると、ブックマークとメモは当方のサーバー上のあなたのアカウントに保存され、どの端末からでも使えます。ブラウザに保存されていた記録は、一度だけアカウントに統合されます。見られるのはあなただけです。ブックマークを外してもメモは消えません。
                </P>
                <P>
                  アプリ「inApp」で同じアカウントにログインすると、ブックマークとメモはアプリとサイトの間で同期されます。ログイン時にアプリの記録が一度だけアカウントに統合され、その後の変更は双方向に反映されます。
                </P>
              </>
            ),
          },
          {
            id: "payments",
            title: "購入",
            body: (
              <>
                <P>
                  サイトでの支払いはYooKassa（NKO YooMoney）が処理します。カードやSBPの情報はYooKassaのページで入力され、当方からは見えません。当方が保存するのは、支払ったアカウント、金額、支払い方法、状況、YooKassaでの支払い番号です。アクセスを開放し、支払いに関するご質問に答えるために使います。
                </P>
                <P>
                  iOSアプリでの購入はAppleが処理し、サブスクリプションの確認にはRevenueCatというサービスを使います。アプリでアカウントにログインしている場合、アプリはアカウントのIDをRevenueCatに渡し、当方のサーバーはそのIDでinApp Plusのサブスクリプションが有効かどうかをRevenueCatに問い合わせます。結果（有効かどうか、期限、買い切りかどうか、確認日時）はアカウントに保存し、サイトでもあなたのアカウントでPlusが使えるようにします。AppleとRevenueCatからカード情報が当方に渡ることはありません。
                </P>
              </>
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
                    ：ブックマークとメモ。sessionStorageの{code("ia2:tabs")}：各タブで最後に開いたページ、
                    {code("ia2:pulse.feed")}：「パルス」で読み込んだカードと「戻る」のための表示位置、30分間
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
              <>
                <P>ログインしていない場合のブックマークとメモは、ブラウザの設定でサイトのデータを消すと削除されます。</P>
                <P>
                  アカウントは{settings("サイトの設定")}（「アカウントを削除」）またはアプリ「inApp」の設定から削除できます。ブックマーク、メモ、閲覧履歴、支払いの記録、アプリでのすべてのログインも一緒に削除されます。Appleでログインしていた場合は、削除時に技術的に可能な範囲でAppleのトークンを取り消します。iPhoneのApple IDの設定にある「Appleでサインイン」から、ご自身でinAppの使用を停止することもできます。
                </P>
                <P>
                  削除できない場合は、ログイン方法（Apple、Telegram、Google、メール）を添えて{mail}
                  までご連絡ください。YooKassaとAppleは、それぞれの規定に従って支払い情報を保管します。
                </P>
              </>
            ),
          },
        ],
        contactLabel: "開発者に連絡する",
        iosLabel: "iOSアプリのプライバシーポリシー",
        updated: "2026年9月26日更新",
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
                <P>
                  You can sign in with Telegram, Google or a link sent by e-mail, and in the inApp iOS app also with Apple.
                  In your account we keep:
                </P>
                <UL
                  items={[
                    "Apple — your Sign in with Apple ID, your e-mail address and name if you choose to share them (the address may be an Apple private relay address), and an encrypted Apple token that lets us revoke the sign-in when the account is deleted;",
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
            id: "app",
            title: "Signing in to the iOS app",
            body: (
              <>
                <P>
                  In the inApp app you can sign in to the same account: with Apple or through this website (Telegram,
                  Google, e-mail). In the second case the website hands the app a one-time code that is valid for 5
                  minutes and works once.
                </P>
                <P>
                  After you sign in, the app keeps a session key in the iPhone Keychain. On our server we keep only a
                  hash of that key, when you signed in and when the app last used it; the account also records when you
                  first signed in to the app. The key works until you sign out in the app or delete the account.
                </P>
              </>
            ),
          },
          {
            id: "saved",
            title: "Bookmarks and notes",
            body: (
              <>
                <P>
                  Once you sign in, your bookmarks and notes are kept in your account on our server so they are on all
                  your devices; the entries from this browser are merged into the account once. Only you can see them.
                  Removing a bookmark does not delete the note.
                </P>
                <P>
                  If you sign in to the same account in the inApp app, bookmarks and notes sync between the app and the
                  website: when you sign in, the app’s entries are merged into the account once, and after that changes
                  go both ways.
                </P>
              </>
            ),
          },
          {
            id: "payments",
            title: "Purchases",
            body: (
              <>
                <P>
                  Payments on the website are processed by YooKassa (NKO YooMoney LLC): card or SBP details are entered
                  on YooKassa’s page and are not available to us. We keep which account paid, the amount, the payment
                  method, the status and YooKassa’s payment number — to grant access and to answer questions about the
                  payment.
                </P>
                <P>
                  Purchases in the iOS app are handled by Apple, and the subscription is checked through the RevenueCat
                  service. If you are signed in to the app, the app gives RevenueCat your account ID, and our server uses
                  that ID to ask RevenueCat whether your inApp Plus subscription is active. We keep the answer in your
                  account (active or not, until when, lifetime or not, when it was checked) so Plus works for your
                  account on the website too. Apple and RevenueCat do not share card details with us.
                </P>
              </>
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
                    bookmarks and notes; sessionStorage {code("ia2:tabs")} — the last page of each tab, {code("ia2:pulse.feed")} —
                    the cards loaded in “Pulse” and the place in the list for Back, 30 minutes;
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
              <>
                <P>
                  Without an account, bookmarks and notes are deleted together with the site data in your browser
                  settings.
                </P>
                <P>
                  You can delete your account in the {settings("website’s Settings")} (“Delete account”) or in the inApp
                  app’s settings. Its bookmarks, notes, page history, payment records and all app sign-ins are deleted
                  with it. If you
                  signed in with Apple, we revoke the Apple token on deletion where this is technically possible; you can
                  also stop using your Apple ID with inApp yourself in your Apple ID settings on iPhone, under “Sign in
                  with Apple”.
                </P>
                <P>
                  If deleting doesn’t work, e-mail {mail} and tell us how you sign in (Apple, Telegram, Google or
                  e-mail). YooKassa and Apple keep payment records under their own rules.
                </P>
              </>
            ),
          },
        ],
        contactLabel: "Contact the developer",
        iosLabel: "iOS app privacy policy",
        updated: "Updated September 26, 2026",
      };
  }
}
