import { toOldLocale, type Locale } from "@/site/i18n/locales";
import { oldLinksInEnglish, oldTopicHref } from "@/site/sitedata";
import { AppPromo } from "./AppPromo";
import { researchStrings } from "./strings";

// The end of every topic page, readable or locked. The page is a copy of the app's article
// (owner, 2026-09-23: the «Приложения в этой теме» block with other apps was removed); the
// web adds the promo of our own iOS app and a quiet link to the previous version of the
// breakdown on the old site. «Пульс категории» is no longer here: it sits right under the hero
// (owner, 2026-09-25), see CategoryPulse and the topic page.

export function TopicExtras({ locale, slug }: { locale: Locale; slug: string }) {
  const s = researchStrings[locale];
  const old = oldTopicHref(locale, slug);
  const oldLang = toOldLocale(locale);
  const english = oldLinksInEnglish(locale) && s.englishNote;
  return (
    <div className="ia-rs-extras">
      <AppPromo locale={locale} />
      {old ? (
        <ul className="ia-rs-links">
          <li>
            {/* The previous site (another root layout): a plain link. */}
            <a className="ia-rs-old-link" href={old} hrefLang={oldLang === locale ? undefined : oldLang}>
              {s.oldVersion}
              {english ? <span className="ia-rs-links__note">{english}</span> : null}
            </a>
          </li>
        </ul>
      ) : null}
    </div>
  );
}
