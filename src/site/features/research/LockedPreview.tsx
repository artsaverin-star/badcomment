import Link from "next/link";
import type { CatalogCategory } from "@/site/content/types";
import type { Locale } from "@/site/i18n/locales";
import type { T } from "@/site/i18n/translate";
import { FREE_CATEGORY } from "@/site/manifest.generated";
import { routes } from "@/site/routing";
import { Card, Heading, LockIcon } from "@/site/ui";
import { LockedNote, PaywallButton } from "./ArticleChrome";
import { Artwork } from "./ResearchArticle";

// The app's locked preview of a research topic (spec 01 §5.1, 03 §3.4, 04 §5.6). Built from
// PUBLIC catalogue fields only — {name, summary, cover}; the article is never loaded for it.
// No corpus sentence, no bookmark/TOC/menu (the toolbar has «Назад» only).

export function LockedPreview({
  locale,
  category,
  t,
}: {
  locale: Locale;
  category: Pick<CatalogCategory, "slug" | "name" | "summary" | "cover">;
  t: T;
}) {
  return (
    <div className="ia-rs-locked" id="clarity-content-locked">
      <Artwork art={category.cover} eager />
      <Heading id="clarity-locked-title" title={category.name} subtitle={category.summary} />
      <Card className="ia-rs-lock-card">
        <p className="ia-rs-lock-card__label">
          <LockIcon size={17} strokeWidth={2} aria-hidden="true" />
          {t("Полный материал в Plus")}
        </p>
        <p className="ia-rs-lock-card__body">{t("Все разборы и идеи — в одной подписке.")}</p>
        <PaywallButton source="research_locked" />
        <Link className="ia-rs-text-link" href={routes.topic(locale, FREE_CATEGORY)} id="clarity-content-free-sample">
          {t("Сначала прочитать бесплатный разбор")}
        </Link>
      </Card>
      <LockedNote slug={category.slug} title={category.name} />
    </div>
  );
}
