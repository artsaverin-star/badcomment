import type { ReactNode } from "react";
import type { Art } from "@/site/content/types";
import type { Locale } from "@/site/i18n/locales";
import type { T } from "@/site/i18n/translate";
import { LockIcon, SearchIcon } from "@/site/ui/icons";
import { cx } from "@/site/ui/cx";
import type { LandingData } from "./data";
import { MediaImg, quoted } from "./parts";

// Device mock-ups rendered in HTML/CSS from the FREE layer only (spec 08 S6/S9). The store
// screenshots in AppStore/Release-*/raw are not used: they are 1320×2868 PNGs outside
// public/, and the idea capture shows a paid idea's title. Mocks are decorative
// (aria-hidden): the step copy next to them says the same thing.

export function PhoneFrame({ children, tilt = 0, className }: { children: ReactNode; tilt?: number; className?: string }) {
  return (
    <div className={cx("ld-phone", className)} aria-hidden="true" style={tilt ? { rotate: `${tilt}deg` } : undefined}>
      <div className="ld-phone__screen">
        <div className="ld-phone__status">
          <span>9:41</span>
          <span className="ld-phone__island" />
          <span className="ld-phone__bars" />
        </div>
        {children}
      </div>
    </div>
  );
}

export function BrowserFrame({ url, children }: { url: string; children: ReactNode }) {
  return (
    <div className="ld-browser" aria-hidden="true">
      <div className="ld-browser__bar">
        <span className="ld-browser__dots">
          <i />
          <i />
          <i />
        </span>
        <span className="ld-browser__url">{url}</span>
      </div>
      <div className="ld-browser__body">{children}</div>
    </div>
  );
}

const thumb = (art: Art, className = "ld-m-thumb") => <MediaImg art={art} width={480} sizes="96px" className={className} />;

/** Step 1: a free research article (cover, name, corpus sentence, a quote). */
export function ResearchScreen({ data, t, locale }: { data: LandingData; t: T; locale: Locale }) {
  const topic = data.freeTopic;
  const quote = data.articles[0]?.quote;
  return (
    <div className="ld-m">
      <span className="ld-m-pill">‹ {t("Назад")}</span>
      <MediaImg art={topic.cover} width={480} sizes="240px" className="ld-m-cover" />
      <p className="ld-m-title">{topic.name}</p>
      {topic.corpusSentence ? <p className="ld-m-meta">{topic.corpusSentence}</p> : null}
      <p className="ld-m-h">{t("Главное")}</p>
      <p className="ld-m-text">{topic.summary}</p>
      {quote ? <p className="ld-m-quote">{quoted(quote.excerpt, locale)}</p> : null}
    </div>
  );
}

/** Step 2: a free idea page. */
export function IdeaScreen({ data, t }: { data: LandingData; t: T }) {
  const idea = data.freeIdeas[2] ?? data.freeIdeas[0];
  if (!idea) return null;
  return (
    <div className="ld-m">
      <span className="ld-m-pill">‹ {t("Назад")}</span>
      <MediaImg art={idea.cover} width={480} sizes="240px" className="ld-m-cover ld-m-cover--round" />
      <p className="ld-m-caption">{t("Идея")}</p>
      <p className="ld-m-title">{idea.title}</p>
      <p className="ld-m-text">{idea.description}</p>
      <p className="ld-m-meta">{data.freeTopic.name}</p>
    </div>
  );
}

/** Step 3: Saved — a topic, an idea and a note. */
export function SavedScreen({ data, t, note }: { data: LandingData; t: T; note: string }) {
  const [idea, second] = [data.freeIdeas[0], data.freeIdeas[3]];
  return (
    <div className="ld-m">
      <p className="ld-m-large">{t("Сохранённое")}</p>
      <p className="ld-m-meta">{t("Материалы и личные заметки")}</p>
      <span className="ld-m-search">
        <SearchIcon size={11} />
        {t("Найти в сохранённом")}
      </span>
      <div className="ld-m-group">
        <div className="ld-m-row">
          {thumb(data.freeTopic.cover)}
          <span>
            <b>{data.freeTopic.name}</b>
            <small>{t("Разбор")}</small>
          </span>
        </div>
        {idea ? (
          <div className="ld-m-row">
            {thumb(idea.cover)}
            <span>
              <b>{idea.title}</b>
              <small>{t("Идея")}</small>
            </span>
          </div>
        ) : null}
        {second ? (
          <div className="ld-m-row">
            {thumb(second.cover)}
            <span>
              <b>{second.title}</b>
              <small>{t("Идея")}</small>
            </span>
          </div>
        ) : null}
      </div>
      <div className="ld-m-note">
        <small>{t("Моя заметка")}</small>
        <span>{note}</span>
      </div>
    </div>
  );
}

/** Step 4: the export document (1. breakdown · 2. idea · 3. my note). */
export function ExportScreen({ data, t, note }: { data: LandingData; t: T; note: string }) {
  const idea = data.freeIdeas[0];
  return (
    <div className="ld-m">
      <p className="ld-m-caption">{t("Предпросмотр документа")}</p>
      <p className="ld-m-title">{t("Готовый документ")}</p>
      <div className="ld-m-doc">
        <b>{t("1. РАЗБОР КАТЕГОРИИ")}</b>
        <span>{data.freeTopic.name}</span>
        <i />
        <i />
        <i className="short" />
        <b>{t("2. ИДЕЯ")}</b>
        <span>{idea?.title}</span>
        <i />
        <i className="short" />
        <b>{t("3. МОЯ ЗАМЕТКА")}</b>
        <span>{note}</span>
      </div>
      {/* The app's file name rule (spec 02 §7.4): "inApp — <title>.txt". */}
      <span className="ld-m-file">{`inApp — ${(idea?.title ?? "").replace(/[/\\:*?"<>|\n]/g, " ").slice(0, 100)}.txt`}</span>
      <span className="ld-m-button">{t("Скачать документ")}</span>
    </div>
  );
}

/** S9 phone: the catalog tab. */
export function CatalogScreen({ data, t }: { data: LandingData; t: T }) {
  return (
    <div className="ld-m">
      <p className="ld-m-large ld-m-serif">{t("Разборы")}</p>
      <p className="ld-m-meta">{t("Что людям важно в приложениях и чего им не хватает.")}</p>
      <span className="ld-m-search">
        <SearchIcon size={11} />
        {t("Категория или потребность")}
      </span>
      {data.topics.slice(0, 2).map((topic) => (
        <div key={topic.slug} className="ld-m-card">
          <MediaImg art={topic.cover} width={480} sizes="240px" className="ld-m-card__art" />
          <p className="ld-m-card__title">
            {topic.name}
            {topic.free ? null : <LockIcon size={10} />}
          </p>
          {topic.free ? <span className="ld-m-badge">{t("Бесплатный разбор")}</span> : null}
        </div>
      ))}
    </div>
  );
}

/** S9 browser: the catalog as a three-column grid. */
export function WebCatalog({ data, t }: { data: LandingData; t: T }) {
  return (
    <div className="ld-w">
      <p className="ld-w__title">{t("Разборы")}</p>
      <p className="ld-w__sub">{t("Что людям важно в приложениях и чего им не хватает.")}</p>
      <div className="ld-w__grid">
        {data.topics.slice(0, 6).map((topic) => (
          <div key={topic.slug} className="ld-w__card">
            <MediaImg art={topic.cover} width={480} sizes="160px" className="ld-w__art" />
            <span className="ld-w__name">
              {topic.name}
              {topic.free ? null : <LockIcon size={9} />}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
