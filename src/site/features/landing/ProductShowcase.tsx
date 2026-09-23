"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { ArrowRight, ArrowUpRight, Layers3 } from "lucide-react";
import { mediaSrc, mediaSrcSet } from "@/site/content/media";
import { INTL_LOCALE, type Locale } from "@/site/i18n/locales";
import { FREE_IDEAS } from "@/site/manifest.generated";
import { routes } from "@/site/routing";
import type { LandingIdea, LandingTopic } from "./data";
import type { LaunchCopy } from "./launchCopy";
import { fillCopy } from "./formatLaunchCopy";

type ShowcaseTab = "topics" | "ideas";

export type ShowcaseCopy = Pick<
  LaunchCopy,
  | "collection"
  | "collectionExample"
  | "collectionLabel"
  | "topicsTab"
  | "ideasTab"
  | "collectionHint"
  | "freeBreakdown"
  | "nicheBreakdown"
  | "topicCardBody"
  | "openIdea"
  | "topicsFooter"
  | "ideasFooter"
  | "openCatalog"
>;

const preferredTopics = [
  "interior-design",
  "habit-tracking",
  "personal-finance",
  "calendars-tasks",
] as const;

const freeIdeaSlugs = new Set<string>(FREE_IDEAS);

export function ProductShowcase({
  locale,
  copy,
  topics,
  ideas,
  topicCount,
  ideaCount,
}: {
  locale: Locale;
  copy: ShowcaseCopy;
  topics: LandingTopic[];
  /** Public card copy from LandingData.freeIdeas only. */
  ideas: LandingIdea[];
  topicCount: number;
  ideaCount: number;
}) {
  const [activeTab, setActiveTab] = useState<ShowcaseTab>("topics");
  const id = useId();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const formatNumber = new Intl.NumberFormat(INTL_LOCALE[locale]).format;
  const tabs = [
    { key: "topics" as const, label: copy.topicsTab, count: topicCount },
    { key: "ideas" as const, label: copy.ideasTab, count: ideaCount },
  ];
  const selectedTopics = preferredTopics.flatMap((slug) => {
    const topic = topics.find((entry) => entry.slug === slug);
    return topic ? [topic] : [];
  });
  const previewTopics = [
    ...selectedTopics,
    ...topics.filter((topic) => !selectedTopics.some((entry) => entry.slug === topic.slug)),
  ].slice(0, 4);
  const previewIdeas = ideas.filter((idea) => freeIdeaSlugs.has(idea.slug)).slice(0, 4);

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number;
    switch (event.key) {
      case "ArrowRight":
        nextIndex = (index + 1) % tabs.length;
        break;
      case "ArrowLeft":
        nextIndex = (index - 1 + tabs.length) % tabs.length;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = tabs.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    setActiveTab(tabs[nextIndex].key);
    tabRefs.current[nextIndex]?.focus();
  }

  return (
    <div className="sx-showcase">
      <div className="sx-windowbar">
        <span className="sx-window-dots" aria-hidden="true"><i /><i /><i /></span>
        <span className="sx-window-title"><Layers3 size={15} aria-hidden="true" /> inApp / {copy.collection}</span>
        <span className="sx-window-caption">{copy.collectionExample}</span>
      </div>

      <div className="sx-preview-toolbar">
        <div className="sx-preview-tabs" role="tablist" aria-label={copy.collectionLabel}>
          {tabs.map((tab, index) => (
            <button
              key={tab.key}
              ref={(element) => { tabRefs.current[index] = element; }}
              className="sx-preview-tab"
              type="button"
              role="tab"
              id={`${id}-tab-${tab.key}`}
              aria-controls={`${id}-panel-${tab.key}`}
              aria-selected={activeTab === tab.key}
              tabIndex={activeTab === tab.key ? 0 : -1}
              data-active={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
            >
              {tab.label} <span>{formatNumber(tab.count)}</span>
            </button>
          ))}
        </div>
        <span className="sx-preview-hint">{copy.collectionHint}</span>
      </div>

      <div
        id={`${id}-panel-topics`}
        role="tabpanel"
        aria-labelledby={`${id}-tab-topics`}
        hidden={activeTab !== "topics"}
        tabIndex={0}
      >
        <div className="sx-preview-grid">
          {previewTopics.map((topic, index) => (
            <a className="sx-preview-card" key={topic.slug} href={routes.topic(locale, topic.slug)} data-ld-event="landing_topic_open" data-ld-slug={topic.slug}>
              <div className="sx-preview-art" data-topic={topic.slug}>
                {/* eslint-disable-next-line @next/next/no-img-element -- artwork already has responsive WebP variants */}
                <img
                  src={mediaSrc(topic.cover, 480)}
                  srcSet={mediaSrcSet(topic.cover)}
                  sizes="(max-width: 600px) 72vw, (max-width: 960px) 40vw, 280px"
                  width={topic.cover.width}
                  height={topic.cover.height}
                  alt=""
                  loading={index < 2 ? "eager" : "lazy"}
                  decoding="async"
                />
                <span className="sx-preview-tag" data-free={topic.free}>
                  {topic.free ? copy.freeBreakdown : copy.nicheBreakdown}
                </span>
              </div>
              <div className="sx-preview-body">
                <h3>{topic.name}<ArrowUpRight size={18} aria-hidden="true" /></h3>
                <p>{copy.topicCardBody}</p>
              </div>
            </a>
          ))}
        </div>
      </div>

      <div
        id={`${id}-panel-ideas`}
        role="tabpanel"
        aria-labelledby={`${id}-tab-ideas`}
        hidden={activeTab !== "ideas"}
        tabIndex={0}
      >
        <div className="sx-preview-grid">
          {previewIdeas.map((idea) => (
            <a className="sx-preview-card" key={idea.slug} href={routes.idea(locale, idea.slug)} data-ld-event="landing_idea_open" data-ld-slug={idea.slug}>
              <div className="sx-preview-art" data-idea={idea.slug}>
                {/* eslint-disable-next-line @next/next/no-img-element -- artwork already has responsive WebP variants */}
                <img
                  src={mediaSrc(idea.cover, 480)}
                  srcSet={mediaSrcSet(idea.cover)}
                  sizes="(max-width: 600px) 72vw, (max-width: 960px) 40vw, 280px"
                  width={idea.cover.width}
                  height={idea.cover.height}
                  alt=""
                  loading="lazy"
                  decoding="async"
                />
                <span className="sx-preview-tag" data-free="true">{copy.openIdea}</span>
              </div>
              <div className="sx-preview-body">
                <h3>{idea.title}<ArrowUpRight size={18} aria-hidden="true" /></h3>
                <p>{idea.description}</p>
              </div>
            </a>
          ))}
        </div>
      </div>

      <div className="sx-preview-footer">
        <span>{activeTab === "topics" ? fillCopy(copy.topicsFooter, { topics: formatNumber(topicCount) }) : fillCopy(copy.ideasFooter, { freeIdeas: formatNumber(FREE_IDEAS.length) })}</span>
        <a href={activeTab === "topics" ? routes.research(locale) : routes.ideas(locale)} data-ld-event="landing_cta_web">
          {copy.openCatalog} <ArrowRight size={16} aria-hidden="true" />
        </a>
      </div>
    </div>
  );
}
