import type { ReactNode } from "react";
import { APP_DEVELOPER, SITE_URL } from "@/site/config";
import type { Locale } from "@/site/i18n/locales";
import { APPLE_REFUND_URL } from "@/lib/legalPages";
import { Ext, MailLink } from "./components";

// Support page of inApp — /<L>/contacts. It is the App Store Support URL (/en/contacts) and
// the iOS app's «Написать разработчику» link, so App Review reads it: no website prices, no
// payment methods, no purchase links (DECISIONS "Legal pages"). Developer details = App Store
// Connect (APP_DEVELOPER). en and ru are VERBATIM from the App-Review hotfix
// (src/app/(old)/contacts/page.tsx); de / fr / ja are faithful translations.

export type SupportDoc = {
  title: string;
  lead: string;
  contactTitle: string;
  includeIntro: string;
  include: string[];
  faqTitle: string;
  faq: Array<{ id: string; q: string; a: ReactNode }>;
  legalTitle: string;
  termsLabel: string;
  webPrivacyLabel: string;
  iosPrivacyLabel: string;
  developerTitle: string;
  rows: Array<{ key: string; value: ReactNode }>;
};

export function supportDoc(locale: Locale): SupportDoc {
  const dev = APP_DEVELOPER;
  const mail = <MailLink email={dev.email} />;
  const refund = <Ext href={APPLE_REFUND_URL}>reportaproblem.apple.com</Ext>;
  const site = SITE_URL;
  switch (locale) {
    case "ru":
      return {
        title: "Поддержка inApp",
        lead: "Помощь с iOS-приложением inApp и сайтом inapp.pro.",
        contactTitle: "Как связаться",
        includeIntro: "Чтобы мы быстрее помогли, укажите:",
        include: [
          "модель устройства и версию iOS;",
          "версию приложения (откройте вкладку «Сохранённое» и нажмите шестерёнку — версия указана внизу экрана «Настройки»);",
          "коротко, что случилось, и по возможности приложите скриншот.",
        ],
        faqTitle: "Частые вопросы",
        faq: [
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
                Возвраты за покупки в App Store оформляет Apple. Откройте {refund}, войдите с аккаунтом Apple и
                отправьте запрос на возврат по покупке inApp. Сами мы не можем вернуть деньги за покупку в App Store. С
                любым другим вопросом об оплате или доступе пишите на {mail}.
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
                Если вы автор отзыва, процитированного в inApp, или считаете, что цитата или другой материал нарушает
                ваши права, напишите на {mail}: укажите разбор, цитату и суть просьбы. Мы рассмотрим обращение и при
                наличии оснований удалим или исправим материал.
              </>
            ),
          },
        ],
        legalTitle: "Документы",
        termsLabel: "Условия использования",
        webPrivacyLabel: "Конфиденциальность на сайте inapp.pro",
        iosPrivacyLabel: "Политика конфиденциальности iOS-приложения",
        developerTitle: "Разработчик",
        rows: [
          { key: "Разработчик", value: dev.name },
          { key: "Адрес", value: dev.addressRu },
          { key: "E-mail", value: mail },
          { key: "Сайт", value: site },
        ],
      };
    case "de":
      return {
        title: "inApp-Support",
        lead: "Hilfe zur iOS-App inApp und zur Website inapp.pro.",
        contactTitle: "Kontakt",
        includeIntro: "Damit wir schneller helfen können, gib bitte Folgendes an:",
        include: [
          "dein Gerätemodell und deine iOS-Version;",
          "die App-Version (öffne den Tab „Gespeichert“ und tippe auf das Zahnrad – die Version steht unten in den Einstellungen);",
          "eine kurze Beschreibung des Problems und, wenn möglich, einen Screenshot.",
        ],
        faqTitle: "Häufige Fragen",
        faq: [
          {
            id: "restore",
            q: "Wie stelle ich einen Kauf in der iOS-App wieder her?",
            a: "Öffne in der App den Tab „Gespeichert“, tippe auf das Zahnrad (Einstellungen) und dann auf „Käufe wiederherstellen“ – oder tippe auf dem Kaufbildschirm auf „Wiederherstellen“. Achte darauf, dass du mit demselben Apple Account angemeldet bist, mit dem du inApp Plus gekauft hast. Die App hat kein eigenes Konto und keine Anmeldung: Der Zugang ist an deinen Apple Account gebunden.",
          },
          {
            id: "subscription",
            q: "Wie verwalte oder kündige ich mein Abo?",
            a: "Abos werden von Apple verwaltet. Öffne auf dem iPhone Einstellungen → dein Name → Abonnements, wähl inApp und tippe auf „Abo kündigen“. Damit die nächste Verlängerung nicht berechnet wird, kündige spätestens 24 Stunden vor Ende des laufenden Zeitraums; der Zugang bleibt bis zum Ende des bezahlten Zeitraums bestehen. Solange ein Abo aktiv ist, zeigen die Einstellungen der App auch den Punkt „Abo verwalten“.",
          },
          {
            id: "refund",
            q: "Wie bekomme ich eine Erstattung für einen Kauf im App Store?",
            a: (
              <>
                Erstattungen für Käufe im App Store wickelt Apple ab. Öffne {refund}, melde dich mit deinem Apple Account
                an und beantrage eine Erstattung für den Kauf von inApp. Für Käufe im App Store können wir selbst keine
                Erstattungen vornehmen. Bei allen anderen Fragen zu Zahlung oder Zugang schreib an {mail}.
              </>
            ),
          },
          {
            id: "notes",
            q: "Wo werden meine Notizen und Lesezeichen gespeichert?",
            a: "Nur auf deinem Gerät (und in deinen iPhone-Backups, wenn Backups aktiviert sind). Die App lädt sie weder auf unsere Server hoch noch synchronisiert sie sie zwischen Geräten. Wenn du die App löschst, werden sie vom Gerät gelöscht; ein wiederhergestellter Kauf bringt sie nicht zurück.",
          },
          {
            id: "quote",
            q: "Wie melde ich ein Zitat?",
            a: (
              <>
                Wenn du eine Rezension geschrieben hast, die in inApp zitiert wird, oder meinst, dass ein Zitat oder
                anderes Material deine Rechte verletzt, schreib an {mail} – mit dem Namen der Analyse, dem Zitat und
                deinem Anliegen. Wir prüfen die Anfrage und entfernen oder korrigieren das Material, wenn es begründet
                ist.
              </>
            ),
          },
        ],
        legalTitle: "Rechtliches",
        termsLabel: "Nutzungsbedingungen",
        webPrivacyLabel: "Datenschutz auf inapp.pro",
        iosPrivacyLabel: "Datenschutzerklärung (iOS-App)",
        developerTitle: "Angaben zum Entwickler",
        rows: [
          { key: "Entwickler", value: dev.name },
          { key: "Adresse", value: dev.addressEn },
          { key: "E-Mail", value: mail },
          { key: "Website", value: site },
        ],
      };
    case "fr":
      return {
        title: "Assistance inApp",
        lead: "De l’aide pour l’app iOS inApp et le site inapp.pro.",
        contactTitle: "Nous contacter",
        includeIntro: "Pour qu’on puisse t’aider plus vite, indique :",
        include: [
          "le modèle de ton appareil et ta version d’iOS ;",
          "la version de l’app (ouvre l’onglet « Enregistrés » et touche la roue dentée — la version figure en bas des Réglages) ;",
          "une brève description du problème et, si possible, une capture d’écran.",
        ],
        faqTitle: "Questions fréquentes",
        faq: [
          {
            id: "restore",
            q: "Comment restaurer un achat dans l’app iOS ?",
            a: "Ouvre l’onglet « Enregistrés » dans l’app, touche la roue dentée (Réglages) puis « Restaurer les achats » — ou touche « Restaurer » sur l’écran d’achat. Vérifie que tu es connecté avec le même compte Apple que celui utilisé pour acheter inApp Plus. L’app n’a ni compte ni connexion propres : l’accès est lié à ton compte Apple.",
          },
          {
            id: "subscription",
            q: "Comment gérer ou résilier mon abonnement ?",
            a: "Les abonnements sont gérés par Apple. Sur iPhone, ouvre Réglages → ton nom → Abonnements, choisis inApp et touche « Annuler l’abonnement ». Pour éviter le prochain prélèvement, résilie au moins 24 heures avant la fin de la période en cours ; l’accès reste actif jusqu’à la fin de la période payée. Tant qu’un abonnement est actif, les Réglages de l’app affichent aussi « Gérer l’abonnement ».",
          },
          {
            id: "refund",
            q: "Comment obtenir le remboursement d’un achat sur l’App Store ?",
            a: (
              <>
                Les remboursements des achats sur l’App Store sont traités par Apple. Va sur {refund}, connecte-toi avec
                ton compte Apple et demande le remboursement de l’achat inApp. Nous ne pouvons pas rembourser nous-mêmes
                les achats effectués sur l’App Store. Pour toute autre question sur le paiement ou l’accès, écris à{" "}
                {mail}.
              </>
            ),
          },
          {
            id: "notes",
            q: "Où sont stockés mes notes et mes signets ?",
            a: "Uniquement sur ton appareil (et dans les sauvegardes de ton iPhone, si elles sont activées). L’app ne les envoie pas à nos serveurs et ne les synchronise pas entre appareils. Si tu supprimes l’app, ils sont supprimés de l’appareil ; restaurer un achat ne les fait pas revenir.",
          },
          {
            id: "quote",
            q: "Comment signaler une citation ?",
            a: (
              <>
                Si tu as écrit un avis cité dans inApp, ou si tu estimes qu’une citation ou un autre contenu porte
                atteinte à tes droits, écris à {mail} en indiquant le nom du décryptage, la citation et ta demande. Nous
                l’examinerons et retirerons ou corrigerons le contenu si nécessaire.
              </>
            ),
          },
        ],
        legalTitle: "Documents",
        termsLabel: "Conditions d’utilisation",
        webPrivacyLabel: "Confidentialité sur inapp.pro",
        iosPrivacyLabel: "Politique de confidentialité (app iOS)",
        developerTitle: "Informations sur le développeur",
        rows: [
          { key: "Développeur", value: dev.name },
          { key: "Adresse", value: dev.addressEn },
          { key: "E-mail", value: mail },
          { key: "Site web", value: site },
        ],
      };
    case "ja":
      return {
        title: "inAppサポート",
        lead: "iOSアプリ「inApp」とウェブサイトinapp.proのヘルプ。",
        contactTitle: "お問い合わせ",
        includeIntro: "スムーズにお答えできるよう、次の情報を添えてください。",
        include: [
          "端末のモデルとiOSのバージョン",
          "アプリのバージョン（「保存済み」タブを開いて歯車をタップすると、「設定」画面のいちばん下に表示されます）",
          "起きたことの簡単な説明と、可能であればスクリーンショット",
        ],
        faqTitle: "よくある質問",
        faq: [
          {
            id: "restore",
            q: "iOSアプリで購入を復元するには？",
            a: "アプリの「保存済み」タブを開き、歯車（設定）をタップして「購入を復元」を選んでください。購入画面の「復元」をタップしてもかまいません。inApp Plusを購入したときと同じApple Accountでサインインしているか確認してください。アプリには独自のアカウントやログインはなく、アクセスはApple Accountにひもづいています。",
          },
          {
            id: "subscription",
            q: "サブスクリプションの管理や解約は？",
            a: "サブスクリプションはAppleが管理しています。iPhoneで「設定」→ 自分の名前 →「サブスクリプション」を開き、inAppを選んで「サブスクリプションをキャンセルする」をタップしてください。次の更新で請求されないようにするには、現在の期間が終わる24時間前までに解約してください。支払い済みの期間が終わるまでアクセスは続きます。サブスクリプションが有効なあいだは、アプリの「設定」にも「サブスクリプションの管理」が表示されます。",
          },
          {
            id: "refund",
            q: "App Storeでの購入を返金してもらうには？",
            a: (
              <>
                App Storeでの購入の返金はAppleが扱います。{refund}
                を開き、Apple AccountでサインインしてinAppの購入の返金をリクエストしてください。App
                Storeでの購入について、当方が直接返金することはできません。支払いやアクセスについてのそのほかのご質問は{mail}
                までお送りください。
              </>
            ),
          },
          {
            id: "notes",
            q: "メモとブックマークはどこに保存されますか？",
            a: "お使いの端末にだけ保存されます（バックアップをオンにしている場合はiPhoneのバックアップにも）。アプリはそれらを当方のサーバーに送らず、端末間で同期もしません。アプリを削除すると端末からも削除され、購入を復元しても戻りません。",
          },
          {
            id: "quote",
            q: "引用について報告するには？",
            a: (
              <>
                inAppで引用されたレビューを書いた方、または引用やその他の資料が自分の権利を侵害していると考える方は、分析の名前、該当する引用、ご要望を添えて{mail}
                までご連絡ください。内容を確認し、必要に応じて資料を削除または修正します。
              </>
            ),
          },
        ],
        legalTitle: "規約とポリシー",
        termsLabel: "利用規約",
        webPrivacyLabel: "inapp.proのプライバシー",
        iosPrivacyLabel: "プライバシーポリシー（iOSアプリ）",
        developerTitle: "開発者情報",
        rows: [
          { key: "開発者", value: dev.name },
          { key: "住所", value: dev.addressEn },
          { key: "メール", value: mail },
          { key: "ウェブサイト", value: site },
        ],
      };
    default:
      return {
        title: "inApp Support",
        lead: "Help with the inApp iOS app and the website inapp.pro.",
        contactTitle: "Contact us",
        includeIntro: "To help us answer faster, please include:",
        include: [
          "your device model and iOS version;",
          "the app version (open the Saved tab and tap the gear icon — the version is shown at the bottom of Settings);",
          "a short description of the problem and, if possible, a screenshot.",
        ],
        faqTitle: "Frequently asked questions",
        faq: [
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
                request a refund for the inApp purchase. We cannot issue refunds for App Store purchases ourselves. For
                any other payment or access question, e-mail {mail}.
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
                {mail} with the name of the breakdown, the quote and your request. We will review it and remove or
                correct the material where appropriate.
              </>
            ),
          },
        ],
        legalTitle: "Legal",
        termsLabel: "Terms of Use",
        webPrivacyLabel: "Privacy on inapp.pro",
        iosPrivacyLabel: "Privacy Policy (iOS app)",
        developerTitle: "Developer information",
        rows: [
          { key: "Developer", value: dev.name },
          { key: "Address", value: dev.addressEn },
          { key: "E-mail", value: mail },
          { key: "Website", value: site },
        ],
      };
  }
}
