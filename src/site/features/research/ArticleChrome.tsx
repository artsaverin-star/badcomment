"use client";

import { useEffect, useState } from "react";
import type { TocEntry } from "@/site/content/types";
import { BookmarkButton, NoteSheet } from "@/site/features/library/components";
import { useT } from "@/site/i18n/client";
import { openPaywall } from "@/site/shell/actions";
import {
  BackButton,
  Button,
  DetailToolbar,
  IconButton,
  Menu,
  NoteIcon,
  Sheet,
  SheetAction,
  TocIcon,
  ToolbarPill,
} from "@/site/ui";
import { cx } from "@/site/ui/cx";

// Client chrome of the research article (spec 01 §5.3–§5.7): the reader toolbar (Назад ·
// bookmark · contents · ⋯ → «Заметка к разбору»), the TOC sheet (mobile) and the sticky TOC
// rail (≥ 1200), plus the two interactive bits of the locked preview. The article body itself
// is server-rendered; nothing here receives article text except the TOC titles of a readable
// article.

/** Scroll an article anchor to the top (smooth unless Reduce Motion) and move focus there. */
function scrollToAnchor(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  const target = (el.querySelector("h2, h3") as HTMLElement | null) ?? el;
  if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
  target.focus({ preventScroll: true });
}

function TocList({
  entries,
  current,
  onSelect,
  idPrefix,
}: {
  entries: TocEntry[];
  current?: string | null;
  onSelect: (id: string) => void;
  /** Element id prefix for the rows (only one list per page may set it). */
  idPrefix?: string;
}) {
  return (
    <ul className="ia-rs-toc">
      {entries.map((entry) => (
        <li key={entry.id}>
          <a
            href={`#${entry.id}`}
            id={idPrefix ? `${idPrefix}${entry.id}` : undefined}
            className={cx("ia-rs-toc__link", entry.depth === 1 && "ia-rs-toc__link--depth1")}
            aria-current={current === entry.id ? "location" : undefined}
            onClick={(e) => {
              if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
              e.preventDefault();
              onSelect(entry.id);
            }}
          >
            {entry.title}
          </a>
        </li>
      ))}
    </ul>
  );
}

/** Toolbar of a readable article + its TOC sheet and note editor. */
export function ArticleToolbar({
  slug,
  title,
  toc,
  backHref,
}: {
  slug: string;
  /** Topic name (note editor title). */
  title: string;
  toc: TocEntry[];
  backHref: string;
}) {
  const t = useT();
  const [tocOpen, setTocOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [jump, setJump] = useState<string | null>(null);

  // Jump only after the sheet is gone (the app scrolls once the dismissal finished): closing
  // pops the sheet's history entry, so wait for that popstate (or a short fallback).
  useEffect(() => {
    if (tocOpen || !jump) return;
    let done = false;
    const run = () => {
      if (done) return;
      done = true;
      // A tick later: after the router and the browser have handled the history step.
      window.setTimeout(() => scrollToAnchor(jump), 30);
      setJump(null);
    };
    window.addEventListener("popstate", run);
    const timer = window.setTimeout(run, 320);
    return () => {
      window.removeEventListener("popstate", run);
      window.clearTimeout(timer);
    };
  }, [tocOpen, jump]);

  return (
    <>
      <DetailToolbar
        leading={<BackButton label={t("Назад")} fallbackHref={backHref} />}
        trailing={
          <ToolbarPill icons>
            <BookmarkButton kind="research" slug={slug} />
            <IconButton
              label={t("Содержание разбора")}
              className="ia-rs-toc-button"
              id="clarity-research-contents"
              aria-haspopup="dialog"
              onClick={() => setTocOpen(true)}
            >
              <TocIcon size={17} strokeWidth={2} aria-hidden="true" />
            </IconButton>
            <Menu
              label={t("Действия с разбором")}
              items={[
                {
                  label: t("Заметка к разбору"),
                  icon: <NoteIcon size={17} strokeWidth={2} />,
                  onSelect: () => setNoteOpen(true),
                },
              ]}
            />
          </ToolbarPill>
        }
      />
      <Sheet
        open={tocOpen}
        onClose={() => setTocOpen(false)}
        title={t("Содержание")}
        paper="reading"
        trailing={<SheetAction onClick={() => setTocOpen(false)}>{t("Готово")}</SheetAction>}
      >
        <nav className="ia-rs-sheet-toc" aria-label={t("Содержание разбора")}>
          <TocList
            entries={toc}
            idPrefix="clarity-research-jump-"
            onSelect={(id) => {
              setJump(id);
              setTocOpen(false);
            }}
          />
        </nav>
      </Sheet>
      <NoteSheet open={noteOpen} onClose={() => setNoteOpen(false)} kind="research" slug={slug} title={title} />
    </>
  );
}

/** Sticky TOC rail for wide screens (hidden < 1200 by CSS), highlighting the current part. */
export function TocRail({ toc }: { toc: TocEntry[] }) {
  const t = useT();
  const [current, setCurrent] = useState<string | null>(null);

  // Scroll-spy only while the rail is shown (≥ 1200, research.css): no per-frame layout reads
  // on phones and tablets (review performance P12).
  useEffect(() => {
    const wide = window.matchMedia("(min-width: 1200px)");
    let frame = 0;
    let attached = false;
    const update = () => {
      frame = 0;
      const line = Math.min(window.innerHeight * 0.3, 220);
      let active: string | null = null;
      for (const entry of toc) {
        const el = document.getElementById(entry.id);
        if (!el) continue;
        if (el.getBoundingClientRect().top - line <= 0) active = entry.id;
        else break;
      }
      setCurrent(active);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    const attach = () => {
      if (attached) return;
      attached = true;
      frame = window.requestAnimationFrame(update);
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll);
    };
    const detach = () => {
      if (!attached) return;
      attached = false;
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
    };
    const sync = () => (wide.matches ? attach() : detach());
    sync();
    wide.addEventListener("change", sync);
    return () => {
      wide.removeEventListener("change", sync);
      detach();
    };
  }, [toc]);

  return (
    <nav className="ia-rs-rail" aria-labelledby="research-rail-title">
      <p className="ia-rs-toc__title" id="research-rail-title">
        {t("Содержание")}
      </p>
      <TocList entries={toc} current={current} onSelect={scrollToAnchor} />
    </nav>
  );
}

/**
 * Toolbar of the locked preview: «Назад» only. The app's inline nav title «Разбор» is left
 * out on the web: the transparent toolbar has no bar behind a title, so it would sit on top
 * of the scrolling text (the page heading right below names the topic anyway).
 */
export function LockedToolbar({ backHref }: { backHref: string }) {
  const t = useT();
  return <DetailToolbar leading={<BackButton label={t("Назад")} fallbackHref={backHref} />} />;
}

/** «Открыть все материалы» → the paywall (spec 01 §5.1, 03 §3.4). */
export function PaywallButton({ source }: { source: string }) {
  const t = useT();
  return (
    <Button variant="primary" id="clarity-content-paywall" onClick={() => openPaywall({ source })}>
      {t("Открыть все материалы")}
    </Button>
  );
}

/** «Моя заметка к материалу» on the locked preview (free users can write notes; saving bookmarks). */
export function LockedNote({ slug, title }: { slug: string; title: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="ia-rs-text-link ia-rs-text-link--body"
        id="clarity-locked-note"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <NoteIcon size={18} strokeWidth={2} aria-hidden="true" />
        {t("Моя заметка к материалу")}
      </button>
      <NoteSheet open={open} onClose={() => setOpen(false)} kind="research" slug={slug} title={title} />
    </>
  );
}
