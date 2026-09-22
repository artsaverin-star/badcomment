import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getViewer } from "@/site/access";
import { getManifest } from "@/site/content";
import { mediaSrc, mediaSrcSet } from "@/site/content/media";
import { pageMetadata } from "@/site/features/legal/meta";
import { SettingsScreen } from "@/site/features/settings/SettingsScreen";
import { settingsStrings } from "@/site/features/settings/strings";
import { isLocale } from "@/site/i18n/locales";
import { getT } from "@/site/i18n/server";
import { routes } from "@/site/routing";
import { THEME_COOKIE, toTheme } from "@/site/theme";

// Settings (spec 02 §8; a page on the web — the app shows it as a sheet over «Сохранённое»).
// noindex (spec 09 §2.1, G9).

type Params = { lang: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = await getT(lang);
  return pageMetadata({
    locale: lang,
    path: (l) => routes.settings(l),
    title: t("Настройки"),
    description: settingsStrings[lang].description,
    index: false,
  });
}

export default async function SettingsPage({ params }: { params: Promise<Params> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const [t, viewer, manifest, jar] = await Promise.all([getT(lang), getViewer(), getManifest(), cookies()]);
  const art = manifest.art.WelcomeLibrary_v7;

  return (
    <SettingsScreen
      locale={lang}
      t={t}
      viewer={viewer}
      theme={toTheme(jar.get(THEME_COOKIE)?.value)}
      collectionDate={manifest.collectionDate}
      plusArt={art ? { src: mediaSrc(art, 224), srcSet: mediaSrcSet(art) } : null}
    />
  );
}
