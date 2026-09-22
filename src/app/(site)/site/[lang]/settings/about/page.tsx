import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getViewer } from "@/site/access";
import { getManifest } from "@/site/content";
import { pageMetadata } from "@/site/features/legal/meta";
import { formatCollectionDate } from "@/site/features/settings/format";
import { settingsStrings } from "@/site/features/settings/strings";
import { isLocale } from "@/site/i18n/locales";
import { getT } from "@/site/i18n/server";
import { routes } from "@/site/routing";
import { Heading } from "@/site/ui/Heading";
import { BackButton, DetailToolbar } from "@/site/ui/Toolbar";
import "@/site/features/settings/settings.css";

// «О материалах» (spec 02 §8.7) with the web deltas of spec 09 G11: «Чтение без интернета» is
// dropped (#6), «Твои записи» says browser or account (#5), the collection date is formatted in
// the page locale. noindex (spec 09 G9).

type Params = { lang: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = await getT(lang);
  return pageMetadata({
    locale: lang,
    path: (l) => routes.settingsAbout(l),
    title: t("О материалах"),
    description: settingsStrings[lang].aboutDescription,
    index: false,
  });
}

export default async function SettingsAboutPage({ params }: { params: Promise<Params> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const [t, viewer, manifest] = await Promise.all([getT(lang), getViewer(), getManifest()]);
  const s = settingsStrings[lang];

  const blocks: Array<[string, string]> = [
    [
      t("Разборы и идеи"),
      t("Материалы составлены по отзывам о приложениях. Цитаты внутри разборов помогают понять, на чём основаны выводы."),
    ],
    [
      t("Бесплатный раздел"),
      t("Разбор интерьеров и 5 идей доступны бесплатно. Остальные идеи и полные разборы открываются с Plus."),
    ],
    [t("Твои записи"), viewer.loggedIn ? s.recordsAccount : s.recordsBrowser],
  ];

  return (
    <div>
      <DetailToolbar leading={<BackButton label={t("Назад")} fallbackHref={routes.settings(lang)} />} />
      <div className="ia-page ia-page--library ia-set-about">
        <Heading title={t("О материалах")} />
        {blocks.map(([title, body]) => (
          <section key={title} className="ia-set-about__block">
            <h2>{title}</h2>
            <p>{body}</p>
          </section>
        ))}
        <p className="ia-set-about__foot">{t("Сборник от %1$@", [formatCollectionDate(manifest.collectionDate, lang)])}</p>
      </div>
    </div>
  );
}
