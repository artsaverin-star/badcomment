import type { Locale } from "@/site/i18n/locales";
import { AppStoreBadge } from "@/site/ui/AppStore";
import { AppMark } from "@/site/ui/icons";
import "./plus.css";

// «Plus и в приложении для iPhone» — for signed-in Plus users (settings, payment return).
// Plus lives on the inApp account, so the iOS app (1.1+) unlocks it after the same sign-in in
// Settings → Account (Guideline 3.1.3(b)). No App Store offer codes: the DPLA forbids handing
// them out in connection with a payment (docs/site-v2/DECISIONS.md).

const STRINGS: Record<Locale, { title: string; body: string; note: string }> = {
  ru: {
    title: "Plus и в приложении для iPhone",
    body: "Plus привязан к твоему аккаунту inApp. Установи приложение из App Store и войди тем же способом: «Настройки» → «Аккаунт».",
    note: "Вход в аккаунт есть в приложении начиная с версии 1.1.",
  },
  en: {
    title: "Plus in the iPhone app too",
    body: "Plus is tied to your inApp account. Install the app from the App Store and sign in the same way: Settings → Account.",
    note: "Account sign-in is available in app version 1.1 and later.",
  },
  de: {
    title: "Plus auch in der iPhone-App",
    body: "Plus ist an dein inApp-Konto gebunden. Installiere die App aus dem App Store und melde dich auf dieselbe Weise an: Einstellungen → Konto.",
    note: "Die Anmeldung gibt es in der App ab Version 1.1.",
  },
  fr: {
    title: "Plus aussi dans l’app iPhone",
    body: "Plus est lié à ton compte inApp. Installe l’app depuis l’App Store et connecte-toi de la même façon : Réglages → Compte.",
    note: "La connexion au compte est disponible à partir de la version 1.1 de l’app.",
  },
  ja: {
    title: "iPhoneアプリでもPlus",
    body: "Plus は inApp アカウントに紐づいています。App Store からアプリをインストールし、同じ方法でサインインしてください：設定 → アカウント。",
    note: "アカウントへのサインインはアプリのバージョン1.1以降で利用できます。",
  },
};

export function AppAccessCard({ locale }: { locale: Locale }) {
  const s = STRINGS[locale];
  return (
    <section className="ia-appaccess" aria-labelledby="ia-appaccess-title" id="app-access">
      <AppMark size={40} />
      <div className="ia-appaccess__main">
        <h2 className="ia-appaccess__title" id="ia-appaccess-title">
          {s.title}
        </h2>
        <p className="ia-appaccess__text">{s.body}</p>
        <AppStoreBadge size="md" />
        <p className="ia-appaccess__note">{s.note}</p>
      </div>
    </section>
  );
}
