import type { Locale } from "@/site/i18n/locales";

// «Plus в приложении для iPhone» — the personal App Store code of website lifetime buyers.
export type AppCodeStrings = {
  title: string;
  body: string;
  validUntil: string; // "{date}"
  copy: string;
  copied: string;
  redeem: string;
  oneAccount: string;
  pendingTitle: string;
  pendingBody: string;
  expiredBody: string;
  support: string;
};

export const appCodeStrings: Record<Locale, AppCodeStrings> = {
  ru: {
    title: "Plus в приложении для iPhone",
    body: "Доступ навсегда у тебя уже есть — поэтому Plus в iOS-приложении inApp для тебя бесплатен. Вот твой личный код.",
    validUntil: "Активируй до {date} включительно.",
    copy: "Скопировать код",
    copied: "Код скопирован",
    redeem: "Активировать в App Store",
    oneAccount: "Код одноразовый: он откроет Plus навсегда для одного аккаунта Apple.",
    pendingTitle: "Plus в приложении для iPhone",
    pendingBody: "Код для бесплатного Plus в iOS-приложении скоро появится в «Настройках».",
    expiredBody: "Срок действия этого кода истёк. Напиши в поддержку — пришлём новый.",
    support: "Написать в поддержку",
  },
  en: {
    title: "Plus in the iPhone app",
    body: "You bought lifetime access on the website, so Plus in the inApp iOS app is free for you. Here is your personal code.",
    validUntil: "Redeem it by {date}.",
    copy: "Copy code",
    copied: "Code copied",
    redeem: "Redeem in the App Store",
    oneAccount: "The code works once: it unlocks lifetime Plus for one Apple Account.",
    pendingTitle: "Plus in the iPhone app",
    pendingBody: "Your code for free Plus in the iOS app will soon appear in Settings.",
    expiredBody: "This code has expired. Write to support and we’ll send you a new one.",
    support: "Contact support",
  },
  de: {
    title: "Plus in der iPhone-App",
    body: "Du hast den lebenslangen Zugang auf der Website gekauft – Plus in der iOS-App inApp ist für dich kostenlos. Hier ist dein persönlicher Code.",
    validUntil: "Löse ihn bis einschließlich {date} ein.",
    copy: "Code kopieren",
    copied: "Code kopiert",
    redeem: "Im App Store einlösen",
    oneAccount: "Der Code ist einmalig: Er schaltet Plus dauerhaft für einen Apple Account frei.",
    pendingTitle: "Plus in der iPhone-App",
    pendingBody: "Dein Code für kostenloses Plus in der iOS-App erscheint bald in den Einstellungen.",
    expiredBody: "Dieser Code ist abgelaufen. Schreib dem Support – wir schicken dir einen neuen.",
    support: "Support kontaktieren",
  },
  fr: {
    title: "Plus dans l’app iPhone",
    body: "Tu as acheté l’accès à vie sur le site : Plus dans l’app iOS inApp est gratuit pour toi. Voici ton code personnel.",
    validUntil: "Utilise-le au plus tard le {date}.",
    copy: "Copier le code",
    copied: "Code copié",
    redeem: "Utiliser dans l’App Store",
    oneAccount: "Le code est à usage unique : il débloque Plus à vie pour un compte Apple.",
    pendingTitle: "Plus dans l’app iPhone",
    pendingBody: "Ton code pour Plus gratuit dans l’app iOS apparaîtra bientôt dans les Réglages.",
    expiredBody: "Ce code a expiré. Écris au support : on t’en enverra un nouveau.",
    support: "Contacter le support",
  },
  ja: {
    title: "iPhoneアプリのPlus",
    body: "サイトで買い切りアクセスを購入済みなので、iOSアプリ inApp の Plus は無料です。あなた専用のコードはこちら。",
    validUntil: "{date}までに引き換えてください。",
    copy: "コードをコピー",
    copied: "コードをコピーしました",
    redeem: "App Storeで引き換える",
    oneAccount: "コードは1回限り。1つのApple Accountで Plus（買い切り）が使えるようになります。",
    pendingTitle: "iPhoneアプリのPlus",
    pendingBody: "iOSアプリのPlusを無料で使えるコードが、まもなく「設定」に表示されます。",
    expiredBody: "このコードは有効期限が切れています。サポートに連絡すると新しいコードをお送りします。",
    support: "サポートに連絡",
  },
};
