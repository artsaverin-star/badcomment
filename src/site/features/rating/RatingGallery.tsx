"use client";

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent, type SyntheticEvent } from "react";
import { useT, useWeb } from "@/site/i18n/client";
import { format } from "@/site/i18n/translate";
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon } from "@/site/ui/icons";
import { IconButton } from "@/site/ui/Toolbar";
import { shotSrc } from "./media";
import { ShotScroller } from "./ShotScroller";
import type { RatingClientStrings } from "./strings";

// The app page's screenshot gallery and its full-screen viewer (spec 11 §3.4). Client; needs
// <I18nProvider strings={t.pick(RATING_UI_KEYS)} web={{ rating: ratingClientStrings(L) }}> above it.
//
//   <section id="screenshots" aria-labelledby="rating-shots-title">
//     <div className="ia-section-head"><h2 id="rating-shots-title" …>{s.shotsTitle}</h2>…</div>
//     <RatingGallery paths={app.shots} app={app.short} />
//   </section>
//
// Gallery: every shot (≤ 10) as a link to its large image (so it works without JS), 360 tall at
// ≥ 760, 300 below, where the track bleeds into the page gutters. The first 2 load eagerly. The
// shots are the tab stops; the arrows are real labelled buttons for mouse users.
// Viewer: a native <dialog> (showModal: top layer, inert page, Esc) on a black backdrop in both
// themes. A scroll-snapped track (swipe = native scrolling) opened at the clicked shot, a live
// «3 из 10» counter, ← → Home End, previous/next circles at ≥ 760, close. It owns one history
// entry, so Back closes it (the Sheet pattern, state key `iaViewer`); focus returns to the
// thumbnail that opened it. Its images mount on open: the opened one and its neighbours load at
// once, the others lazily.

type Opened = { index: number; opener: HTMLElement | null };

export function RatingGallery({ paths, app }: { paths: readonly string[]; app: string }) {
  const t = useT();
  const s = useWeb<RatingClientStrings>("rating");
  const [opened, setOpened] = useState<Opened | null>(null);
  const [current, setCurrent] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const openedRef = useRef<Opened | null>(null);

  const count = paths.length;
  const label = format(s.shotsLabel, { app });
  const alt = (i: number) => format(s.shotAlt, { app, n: i + 1, count });

  // Mirror `opened` onto the native dialog; land on the clicked shot without an animation.
  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (opened && !d.open) {
      openedRef.current = opened;
      d.showModal();
      const el = track.current;
      if (el) el.scrollTo({ left: opened.index * el.clientWidth, behavior: "instant" });
    } else if (!opened && d.open) {
      d.close();
      const opener = openedRef.current?.opener;
      openedRef.current = null;
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    }
  }, [opened]);

  // Unmounting while open (route change) must not leave the document inert.
  useEffect(() => {
    const d = dialog.current;
    return () => {
      if (d?.open) d.close();
    };
  }, []);

  // One history entry while open: Back closes the viewer (src/site/ui/Sheet.tsx, own key).
  const isOpen = opened !== null;
  useEffect(() => {
    if (!isOpen) return;
    const token = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    let pushed = false;
    let popped = false;
    const onPop = () => {
      if ((window.history.state as { iaViewer?: string } | null)?.iaViewer !== token) {
        popped = true;
        setOpened(null);
      }
    };
    // Deferred so React StrictMode's mount → unmount → mount does not push twice.
    const timer = window.setTimeout(() => {
      window.history.pushState({ ...(window.history.state ?? {}), iaViewer: token }, "");
      pushed = true;
      window.addEventListener("popstate", onPop);
    }, 0);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("popstate", onPop);
      const ours = (window.history.state as { iaViewer?: string } | null)?.iaViewer === token;
      if (pushed && !popped && ours) window.history.back();
    };
  }, [isOpen]);

  const close = () => setOpened(null);

  const go = (index: number) => {
    const el = track.current;
    if (!el) return;
    const i = Math.max(0, Math.min(count - 1, index));
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: i * el.clientWidth, behavior: reduce ? "instant" : "smooth" });
  };

  // The counter follows the snapped slide.
  const frame = useRef(0);
  const onScroll = () => {
    if (frame.current) return;
    frame.current = window.requestAnimationFrame(() => {
      frame.current = 0;
      const el = track.current;
      if (!el || el.clientWidth === 0) return;
      setCurrent(Math.max(0, Math.min(count - 1, Math.round(Math.abs(el.scrollLeft) / el.clientWidth))));
    });
  };
  useEffect(() => {
    const f = frame;
    return () => window.cancelAnimationFrame(f.current);
  }, []);

  const onThumb = (e: ReactMouseEvent<HTMLAnchorElement>, index: number) => {
    // A modified click keeps the link's own behaviour (the large image in a new tab).
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    setCurrent(index);
    setOpened({ index, opener: e.currentTarget });
  };

  const onCancel = (e: SyntheticEvent<HTMLDialogElement>) => {
    e.preventDefault(); // Escape: keep React state in sync
    close();
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDialogElement>) => {
    if (e.defaultPrevented) return;
    const moves: Record<string, number> = { ArrowLeft: current - 1, ArrowRight: current + 1, Home: 0, End: count - 1 };
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key in moves) {
      e.preventDefault();
      go(moves[e.key]);
    }
  };

  if (count === 0) return null;

  return (
    <>
      <ShotScroller
        className="ia-rt-gallery"
        trackClassName="ia-rt-gallery__track"
        label={label}
        prevLabel={s.prevShot}
        nextLabel={s.nextShot}
        focusable={false}
      >
        {paths.map((path, i) => (
          <a key={path} className="ia-rt-gallery__shot" href={shotSrc(path, "viewer")} data-rt-shot={i} onClick={(e) => onThumb(e, i)}>
            {/* eslint-disable-next-line @next/next/no-img-element -- D15: CDN-sized <img>, no next/image */}
            <img
              className="ia-rt-shot"
              src={shotSrc(path, "gallery")}
              width={166}
              height={360}
              alt={alt(i)}
              loading={i < 2 ? undefined : "lazy"}
              decoding="async"
            />
          </a>
        ))}
      </ShotScroller>

      <dialog ref={dialog} className="ia-rt-viewer" aria-label={label} onCancel={onCancel} onKeyDown={onKeyDown}>
        {opened ? (
          <>
            <div className="ia-rt-viewer__bar">
              <p className="ia-rt-viewer__count" aria-live="polite">
                {format(s.viewerCount, { n: current + 1, count })}
              </p>
              <IconButton variant="circle" label={t("Закрыть")} className="ia-rt-viewer__btn" onClick={close}>
                <CloseIcon size={20} strokeWidth={2.2} aria-hidden="true" />
              </IconButton>
            </div>
            <div ref={track} className="ia-rt-viewer__track" onScroll={onScroll}>
              {paths.map((path, i) => (
                <div
                  key={path}
                  className="ia-rt-viewer__slide"
                  // A click beside the image closes, like a tap on a photo viewer's backdrop.
                  onClick={(e) => {
                    if (e.target === e.currentTarget) close();
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- D15: CDN-sized <img>, no next/image */}
                  <img
                    className="ia-rt-viewer__img"
                    src={shotSrc(path, "viewer")}
                    width={647}
                    height={1400}
                    alt={alt(i)}
                    loading={Math.abs(i - opened.index) <= 1 ? undefined : "lazy"}
                    decoding="async"
                  />
                </div>
              ))}
            </div>
            <IconButton
              variant="circle"
              label={s.prevShot}
              className="ia-rt-viewer__btn ia-rt-viewer__nav ia-rt-viewer__nav--prev"
              disabled={current === 0}
              onClick={() => go(current - 1)}
            >
              <ChevronLeftIcon size={22} strokeWidth={2.2} aria-hidden="true" />
            </IconButton>
            <IconButton
              variant="circle"
              label={s.nextShot}
              className="ia-rt-viewer__btn ia-rt-viewer__nav ia-rt-viewer__nav--next"
              disabled={current === count - 1}
              onClick={() => go(current + 1)}
            >
              <ChevronRightIcon size={22} strokeWidth={2.2} aria-hidden="true" />
            </IconButton>
          </>
        ) : null}
      </dialog>
    </>
  );
}
