import Link from "next/link";
import { Fragment } from "react";
import { SITE_URL } from "@/site/config";
import type { Locale } from "@/site/i18n/locales";
import { getT } from "@/site/i18n/server";
import { routes } from "@/site/routing";
import { Badge, LockBadge } from "@/site/ui/Badge";
import { Button } from "@/site/ui/Button";
import {
  AlertIcon,
  ArrowRightIcon,
  CheckIcon,
  ChevronDownIcon,
  QuoteIcon,
  SearchIcon,
  SparklesIcon,
} from "@/site/ui/icons";
import { Carousel } from "./Carousel";
import type { LandingData } from "./data";
import { ExpandableGrid, LandingAnalytics, StickyCta } from "./islands";
import {
  BrowserFrame,
  CatalogScreen,
  ExportScreen,
  IdeaScreen,
  PhoneFrame,
  ResearchScreen,
  SavedScreen,
  WebCatalog,
} from "./mocks";
import { fill, Illustration, MediaImg, PaperPair, quoted, Section, StoreBadge } from "./parts";
import { faqEntries, landingJsonLd } from "./seo";
import { FAQ_VISIBLE, landingStrings } from "./strings";
import "./landing.css";

// The signed-out front door at /<L> (spec 08; DECISIONS §9, §12–13). Server-rendered HTML;
// client JS is limited to the carousel, the "show all" toggle, the mobile sticky CTA, the
// analytics listener and the shell's App Store badge.
//
// App Store marketing URL rules: no website prices, no payment methods, no buy buttons, no
// link to the paywall — Plus is explained and points to the App Store badge and the web
// version. Paid ideas appear as artwork only (data.ts).

export async function LandingPage({ locale, data }: { locale: Locale; data: LandingData }) {
  const t = await getT(locale);
  const s = landingStrings[locale];
  const n = data.numbers;
  const num = t.number;
  const free = data.freeTopic;
  const freeHref = routes.topic(locale, free.slug);
  const webHref = routes.research(locale);
  const hero = data.articles[0];
  const art = data.art;

  const faq = faqEntries(s, {
    topics: n.topics,
    ideas: n.ideas,
    reviews: num(n.reviews),
    apps: num(n.apps),
    archiveReviews: num(n.archiveReviews),
    archiveApps: num(n.archiveApps),
    topic: free.name,
    n: n.freeIdeas,
  });

  const quoteLabel = t("Из отзыва пользователя");
  const iconUrl = `${SITE_URL}/brand/app-icon-256.png`;

  const steps = [
    { title: s.step1Title, body: s.step1Body, screen: <ResearchScreen data={data} t={t} locale={locale} /> },
    { title: s.step2Title, body: s.step2Body, screen: <IdeaScreen data={data} t={t} /> },
    { title: s.step3Title, body: s.step3Body, screen: <SavedScreen data={data} t={t} note={s.noteSample} /> },
    { title: s.step4Title, body: s.step4Body, screen: <ExportScreen data={data} t={t} note={s.noteSample} /> },
  ];

  const plusTitle = t("Все разборы\nи идеи").split("\n");

  return (
    <div className="ld">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: landingJsonLd(locale, faq, iconUrl) }} />

      {/* S1 Hero */}
      <section className="ld-hero" aria-labelledby="ld-hero-title">
        <div className="ld-wrap ld-hero__grid">
          <div className="ld-hero__copy">
            <p className="ld-eyebrow">{s.heroEyebrow}</p>
            <h1 id="ld-hero-title" className="ld-h1">
              {s.heroTitle}
            </h1>
            <p className="ld-lead">{fill(s.heroLead, { topics: n.topics, ideas: n.ideas })}</p>
            <div className="ld-cta-row" id="ld-hero-cta">
              <Button
                href={webHref}
                variant="welcome"
                className="ld-btn-lg"
                icon={<ArrowRightIcon size={18} aria-hidden="true" />}
                data-ld-event="landing_cta_web"
              >
                {s.ctaWeb}
              </Button>
              <StoreBadge soon={s.appStoreSoon} />
            </div>
            <p className="ld-hero__free">
              <Link href={freeHref} className="ld-link" data-ld-event="landing_free_research">
                {t("Сначала прочитать бесплатный разбор")} <span aria-hidden="true">→</span>
              </Link>
              <span className="ld-muted">{s.heroMicro}</span>
            </p>
          </div>
          {hero ? (
            <figure className="ld-hero__visual" aria-label={s.heroFigure}>
              <Illustration art={art.WelcomeReviews_v7} className="ld-hero__illo" />
              <PaperPair
                article={hero}
                locale={locale}
                quoteLabel={quoteLabel}
                ratingLabel={s.ratingLabel}
                eager
                className="ld-papers--hero"
              />
            </figure>
          ) : null}
        </div>
      </section>

      {/* S2 Numbers */}
      <section className="ld-numbers" aria-labelledby="ld-numbers-title">
        <div className="ld-wrap">
          <h2 id="ld-numbers-title" className="sr-only">
            {s.numbersTitle}
          </h2>
          <ul className="ld-stats">
            <li className="ld-stat">
              <strong>{num(n.topics)}</strong>
              <span>{s.statTopics}</span>
            </li>
            <li className="ld-stat">
              <strong>{num(n.ideas)}</strong>
              <span>{s.statIdeas}</span>
            </li>
            <li className="ld-stat" title={fill(s.statReviewsHint, { topics: n.topics })}>
              <strong>{num(n.reviews)}</strong>
              <span>{fill(s.statReviews, { apps: num(n.apps) })}</span>
              <span className="sr-only">{fill(s.statReviewsHint, { topics: n.topics })}</span>
            </li>
            <li className="ld-stat">
              <strong>{num(n.languages)}</strong>
              <span>{s.statLanguages}</span>
            </li>
          </ul>
          <p className="ld-footnote">{s.numbersFootnote}</p>
        </div>
      </section>

      {/* S3 Free breakdown */}
      <Section id="research" labelledBy="ld-free-title">
        <div className="ld-head">
          <Badge tone="accent">{t("Бесплатный разбор")}</Badge>
          <h2 id="ld-free-title" className="ld-h2">
            {s.freeTitle}
          </h2>
        </div>
        <article className="ld-free">
          <div className="ld-free__cover">
            <MediaImg art={free.cover} alt={free.cover.alt} width={1200} sizes="(min-width: 1024px) 560px, 100vw" />
          </div>
          <div className="ld-free__body">
            <h3 className="ld-free__title">
              <Link href={freeHref} data-ld-event="landing_free_research">
                {free.name}
              </Link>
            </h3>
            <p className="ld-free__summary">{free.summary}</p>
            {free.corpusSentence ? <p className="ld-free__corpus">{free.corpusSentence}</p> : null}
            {free.parts.length ? (
              <>
                <p className="ld-label">{s.freeInside}</p>
                <ol className="ld-parts">
                  {free.parts.map((p, i) => (
                    <li key={i} className="ld-part">
                      {p.art ? (
                        <MediaImg art={p.art} width={480} sizes="72px" className="ld-part__art" />
                      ) : (
                        <span className="ld-part__art" />
                      )}
                      <span>{p.title}</span>
                    </li>
                  ))}
                </ol>
                <p className="ld-muted ld-small">
                  {fill(s.freeMeta, { parts: free.parts.length, observations: free.observations, ideas: free.ideaCount })}
                </p>
              </>
            ) : null}
            <div>
              <Button
                href={freeHref}
                variant="welcome"
                icon={<ArrowRightIcon size={18} aria-hidden="true" />}
                data-ld-event="landing_free_research"
              >
                {s.freeCta}
              </Button>
            </div>
          </div>
        </article>
      </Section>

      {/* S4 Five free ideas */}
      <Section id="ideas" labelledBy="ld-ideas-title">
        <div className="ld-head">
          <h2 id="ld-ideas-title" className="ld-h2">
            {s.ideasTitle}
          </h2>
          <p className="ld-sub">{t("Кому пригодится приложение, какую задачу оно решит и как им будут пользоваться.")}</p>
        </div>
        <ul className="ld-ideas">
          {data.freeIdeas.map((idea) => (
            <li key={idea.slug}>
              <Link
                href={routes.idea(locale, idea.slug)}
                className="ld-idea"
                data-ld-event="landing_idea_open"
                data-ld-slug={idea.slug}
              >
                <MediaImg art={idea.cover} width={800} sizes="(min-width: 1024px) 380px, (min-width: 760px) 50vw, 100vw" className="ld-idea__art" />
                <div className="ld-idea__body">
                  <h3 className="ld-idea__title">{idea.title}</h3>
                  <p className="ld-idea__desc">{idea.description}</p>
                  <p className="ld-idea__cat">{free.name}</p>
                </div>
              </Link>
            </li>
          ))}
          {data.lockedIdea ? (
            <li>
              <Link
                href={routes.idea(locale, data.lockedIdea.slug)}
                className="ld-idea ld-idea--locked"
                aria-label={t("Идея в Plus")}
                data-ld-event="landing_idea_open"
                data-ld-slug={data.lockedIdea.slug}
              >
                <span className="ld-idea__media">
                  <MediaImg art={data.lockedIdea.cover} width={800} sizes="(min-width: 1024px) 380px, (min-width: 760px) 50vw, 100vw" className="ld-idea__art" />
                  <LockBadge variant="disc" className="ld-idea__disc" />
                </span>
                <div className="ld-idea__body" aria-hidden="true">
                  <p className="ld-idea__title ld-idea__title--locked">{t("Идея в Plus")}</p>
                  <p className="ld-idea__desc">{t("Подробности идеи доступны в Plus.")}</p>
                </div>
              </Link>
            </li>
          ) : null}
        </ul>
        <div className="ld-after">
          <p className="ld-muted">{t("5 идей бесплатно. Остальные — в Plus.")}</p>
          <Link href={routes.ideas(locale)} className="ld-link">
            {s.allIdeas} <span aria-hidden="true">→</span>
          </Link>
        </div>
      </Section>

      {/* S5 Inside the breakdowns */}
      {data.articles.length ? (
        <Section labelledBy="ld-inside-title">
          <div className="ld-head ld-head--center">
            <h2 id="ld-inside-title" className="ld-h2">
              {t("Разборы отзывов")}
            </h2>
            <p className="ld-sub">{t("В каждом разборе — выводы и отзывы, на которых они основаны.")}</p>
          </div>
          <Carousel
            labels={{
              region: s.carouselLabel,
              prev: s.carouselPrev,
              next: s.carouselNext,
              pause: s.carouselPause,
              play: s.carouselPlay,
              slide: s.carouselSlide,
            }}
          >
            {data.articles.map((a) => (
              <div key={a.category} className="ld-slide">
                <PaperPair article={a} locale={locale} quoteLabel={quoteLabel} ratingLabel={s.ratingLabel} />
                <Link
                  href={routes.topic(locale, a.category)}
                  className="ld-link ld-slide__link"
                  aria-label={`${s.openBreakdown}: ${a.label}`}
                  data-ld-event="landing_topic_open"
                  data-ld-slug={a.category}
                >
                  {s.openBreakdown} <span aria-hidden="true">→</span>
                </Link>
              </div>
            ))}
          </Carousel>
        </Section>
      ) : null}

      {/* S6 How it works */}
      <Section labelledBy="ld-how-title" className="ld-section--tint">
        <div className="ld-head ld-head--center">
          <h2 id="ld-how-title" className="ld-h2">
            {s.howTitle}
          </h2>
        </div>
        <ol className="ld-steps">
          {steps.map((step, i) => (
            <li key={i} className="ld-step">
              <div className="ld-step__text">
                <span className="ld-kicker">{fill(s.stepLabel, { n: i + 1 })}</span>
                <h3 className="ld-h3">{step.title}</h3>
                <p className="ld-body">{step.body}</p>
              </div>
              <div className="ld-step__visual">
                <PhoneFrame tilt={i % 2 ? 2 : -2}>{step.screen}</PhoneFrame>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      {/* S7 The 35 breakdowns + what's next */}
      <Section labelledBy="ld-topics-title">
        <div className="ld-head">
          <p className="ld-kicker">{fill(s.topicsKicker, { n: n.topics })}</p>
          <h2 id="ld-topics-title" className="ld-h2">
            {t("Что людям важно в приложениях и чего им не хватает.")}
          </h2>
        </div>
        <ExpandableGrid more={fill(s.topicsShowAll, { n: n.topics })}>
          <ul className="ld-topics">
            {data.topics.map((topic) => (
              <li key={topic.slug} className="ld-topic">
                <Link
                  href={routes.topic(locale, topic.slug)}
                  className="ld-topic__link"
                  data-ld-event="landing_topic_open"
                  data-ld-slug={topic.slug}
                >
                  <MediaImg art={topic.cover} width={480} sizes="(min-width: 1280px) 220px, (min-width: 760px) 30vw, 104px" className="ld-topic__art" />
                  <span className="ld-topic__text">
                    <span className="ld-topic__name">
                      <span>{topic.name}</span>
                      {topic.free ? null : <LockBadge label={t("Полный разбор в Plus")} />}
                    </span>
                    {topic.free ? <Badge tone="accent">{t("Бесплатный разбор")}</Badge> : null}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </ExpandableGrid>
        <div className="ld-next">
          <Illustration art={art.WelcomeLibrary_v7} tilt={26} className="ld-next__illo">
            <span className="ld-chips">
              <span className="ld-chip ld-chip--1">{t("Интерьер")}</span>
              <span className="ld-chip ld-chip--2">{t("Привычки")}</span>
              <span className="ld-chip ld-chip--3">{t("Личные финансы")}</span>
            </span>
          </Illustration>
          <div className="ld-next__text">
            <h3 className="ld-h3">{t("Готовим следующие разборы")}</h3>
            <p className="ld-body">{t("Велоспорт, йога и определение растений и животных.")}</p>
            <p className="ld-muted">{t("С обновлениями приложения регулярно добавляем новые темы, разборы и идеи.")}</p>
            <Link href={webHref} className="ld-link">
              {s.topicsCatalog} <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </Section>

      {/* S8 How we treat the reviews */}
      <Section labelledBy="ld-trust-title" className="ld-section--tint">
        <div className="ld-trust">
          <Illustration art={art.WelcomeResearch_v7} tilt={-18} className="ld-trust__illo" />
          <div>
            <h2 id="ld-trust-title" className="ld-h2">
              {s.trustTitle}
            </h2>
            <ul className="ld-trust__list">
              <li>
                <span className="ld-icon">
                  <QuoteIcon size={20} aria-hidden="true" />
                </span>
                <p>
                  {t(
                    "Материалы составлены по отзывам о приложениях. Цитаты внутри разборов помогают понять, на чём основаны выводы.",
                  )}
                </p>
              </li>
              <li>
                <span className="ld-icon">
                  <SearchIcon size={20} aria-hidden="true" />
                </span>
                <p>{s.trust2}</p>
              </li>
              <li>
                <span className="ld-icon">
                  <AlertIcon size={20} aria-hidden="true" />
                </span>
                <p>{s.trust3}</p>
              </li>
            </ul>
          </div>
        </div>
      </Section>

      {/* S9 Web and iPhone */}
      <Section labelledBy="ld-web-title">
        <div className="ld-head ld-head--center">
          <h2 id="ld-web-title" className="ld-h2">
            {s.webTitle}
          </h2>
        </div>
        <div className="ld-duo">
          <div className="ld-duo__card">
            <div className="ld-duo__visual">
              <BrowserFrame url={`inapp.pro${webHref}`}>
                <WebCatalog data={data} t={t} />
              </BrowserFrame>
            </div>
            <h3 className="ld-h3">{s.webColTitle}</h3>
            <p className="ld-body">{s.webColBody}</p>
            <div className="ld-cta-row">
              <Button
                href={webHref}
                variant="welcome"
                icon={<ArrowRightIcon size={18} aria-hidden="true" />}
                data-ld-event="landing_cta_web"
              >
                {s.ctaWeb}
              </Button>
            </div>
          </div>
          <div className="ld-duo__card">
            <div className="ld-duo__visual">
              <PhoneFrame className="ld-phone--short">
                <CatalogScreen data={data} t={t} />
              </PhoneFrame>
            </div>
            <h3 className="ld-h3">{s.iphoneColTitle}</h3>
            <p className="ld-body">{s.iphoneColBody}</p>
            <div className="ld-cta-row">
              <StoreBadge soon={s.appStoreSoon} />
            </div>
          </div>
        </div>
      </Section>

      {/* S10 inApp Plus — what it opens; no prices, no buy buttons (App Store marketing URL) */}
      <Section id="plus" labelledBy="ld-plus-title" className="ld-plus-section">
        <div className="ld-plus__head">
          <div className="ld-trio" aria-hidden="true">
            {art.WelcomeResearch_v7 ? <MediaImg art={art.WelcomeResearch_v7} width={400} sizes="160px" className="ld-trio__a" /> : null}
            {art.WelcomeLibrary_v7 ? <MediaImg art={art.WelcomeLibrary_v7} width={400} sizes="200px" className="ld-trio__b" /> : null}
            {art.WelcomeProduct_v7 ? <MediaImg art={art.WelcomeProduct_v7} width={400} sizes="160px" className="ld-trio__c" /> : null}
          </div>
          <p className="ld-kicker ld-kicker--plus">inApp PLUS</p>
          <h2 id="ld-plus-title" className="ld-h2">
            {plusTitle.map((line, i) => (
              <Fragment key={i}>
                {i ? <br /> : null}
                {line}
              </Fragment>
            ))}
          </h2>
          <p className="ld-sub">{t("Все разборы и идеи, новые выпуски и экспорт материалов.")}</p>
        </div>
        <div className="ld-plans">
          <div className="ld-plan">
            <h3 className="ld-plan__title">{s.plusFreeTitle}</h3>
            <ul className="ld-checks">
              {[
                fill(s.plusFree1, { topic: free.name }),
                fill(s.plusFree2, { n: n.freeIdeas }),
                fill(s.plusFree3, { topics: n.topics }),
                s.plusFree4,
                s.plusFree5,
              ].map((line) => (
                <li key={line}>
                  <CheckIcon size={18} aria-hidden="true" />
                  {line}
                </li>
              ))}
            </ul>
            <div className="ld-plan__cta">
              <Button href={freeHref} variant="secondary" data-ld-event="landing_free_research">
                {s.freeCta}
              </Button>
            </div>
          </div>
          <div className="ld-plan ld-plan--plus">
            <h3 className="ld-plan__title">
              <SparklesIcon size={20} aria-hidden="true" /> Plus
            </h3>
            <ul className="ld-checks">
              {[fill(s.plusAll1, { topics: n.topics, ideas: n.ideas }), s.plusAll2, t("Новые выпуски")].map((line) => (
                <li key={line}>
                  <CheckIcon size={18} aria-hidden="true" />
                  {line}
                </li>
              ))}
            </ul>
            <div className="ld-plan__iphone">
              <p className="ld-label">{s.plusPlansTitle}</p>
              <ul className="ld-plan__options">
                <li>
                  <b>{t("На год")}</b>
                  <span>{t("Продлевается автоматически")}</span>
                </li>
                <li>
                  <b>{t("Навсегда")}</b>
                  <span>{t("Один платёж. Без продления.")}</span>
                </li>
              </ul>
              <p className="ld-muted ld-small">
                {s.plusTerms} {t("Отменить подписку можно в настройках App Store.")}
              </p>
            </div>
            <p className="ld-body ld-small">{s.plusGet}</p>
            <div className="ld-cta-row ld-plan__cta">
              <StoreBadge soon={s.appStoreSoon} />
              <Button href={webHref} variant="secondary" data-ld-event="landing_cta_web">
                {s.ctaWeb}
              </Button>
            </div>
          </div>
        </div>
      </Section>

      {/* S11 FAQ */}
      <Section id="faq" labelledBy="ld-faq-title">
        <div className="ld-head ld-head--center">
          <h2 id="ld-faq-title" className="ld-h2">
            {s.faqTitle}
          </h2>
        </div>
        <div className="ld-faq">
          {faq.slice(0, FAQ_VISIBLE).map((f, i) => (
            <FaqItem key={i} q={f.q} a={f.a} />
          ))}
          <details className="ld-faq__more">
            <summary>
              {s.faqMore}
              <ChevronDownIcon size={18} aria-hidden="true" />
            </summary>
            <div className="ld-faq__rest">
              {faq.slice(FAQ_VISIBLE).map((f, i) => (
                <FaqItem key={i} q={f.q} a={f.a} />
              ))}
            </div>
          </details>
        </div>
      </Section>

      {/* S12 Final CTA */}
      <section className="ld-final" id="ld-final" aria-labelledby="ld-final-title">
        <div className="ld-wrap ld-final__inner">
          <h2 id="ld-final-title" className="ld-final__title">
            {s.finalTitle}
          </h2>
          <p className="ld-final__sub">{s.ideasTitle}</p>
          <div className="ld-cta-row ld-cta-row--center">
            <Button
              href={webHref}
              variant="welcome"
              className="ld-btn-lg ld-btn-invert"
              icon={<ArrowRightIcon size={18} aria-hidden="true" />}
              data-ld-event="landing_cta_web"
            >
              {s.ctaWeb}
            </Button>
            <StoreBadge soon={s.appStoreSoon} className="ld-store--invert" />
          </div>
          <p className="ld-final__free">
            <Link href={freeHref} data-ld-event="landing_free_research">
              {quoted(free.name, locale)} · {s.freeCta} <span aria-hidden="true">→</span>
            </Link>
          </p>
        </div>
      </section>

      <StickyCta href={webHref} label={s.ctaWeb} after="ld-hero-cta" until="ld-final" />
      <LandingAnalytics />
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <details className="ld-faq__item">
      <summary>
        <h3>{q}</h3>
        <ChevronDownIcon size={18} aria-hidden="true" />
      </summary>
      <p>{a}</p>
    </details>
  );
}
