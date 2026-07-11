"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n";
import BuildProgress from "./BuildProgress";
import { FlameIcon, BulbIcon, SwordsIcon, CoinIcon, SearchAnimIcon, PaletteIcon, CodeIcon, RocketIcon } from "./BuildIcons";
import { downloadZip, type ZipFile } from "@/lib/zipClient";

// The «Создай свой апп» wizard, steps 3-7 of 7 (niche and pain were picked on
// the previous screens). Duolingo-flavored: one thought per screen, big
// friendly cards, a fat progress bar. Design, code and launch are not steps —
// they are work items on the final plan page, downloadable as one archive.

export type BuildData = {
  ideaSlug: string;
  ideaTitle: string;
  oneLiner: string;
  nicheName: string;
  nicheSlug: string;
  hrefBack: string;
  hrefNiches: string;
  painLine: string;
  painQuote?: { quote: string; app: string };
  pitch?: string;
  features: string[];
  founder100?: number;
  buyer?: string;
  pay?: string;
  risk?: string;
  pricePoint?: string;
  competitors: { title: string; icon: string | null; ratings: number; realScore?: number; weak: string; verdict: string; loved: string; shots: string[]; href: string }[];
  aso: {
    terms: string[];
    live: { term: string; hintRank: number | null; median: number; min: number; top: { title: string; ratings: number }[] }[];
    namingHint: string;
  };
  design: { hasSpec: boolean; theme?: string; palette?: { bg: string; surface: string; accent: string; textPrimary: string }; motif?: string; screens: number; parts: string[] };
  codePrompt: string;
  channels: { name: string; note: string; count: number }[];
};

const FIRST_STEP = 2; // «Решение»: steps 0 (ниша) and 1 (боль) live on prior pages
const LAST_STEP = 6; // «План»: the results page

function CopyBtn({ text, label, copiedLabel }: { text: string; label: string; copiedLabel: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      onClick={() => { try { navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1600); } catch {} }}
      className="shrink-0 rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] px-3.5 py-1.5 text-caption font-semibold text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
    >
      {ok ? copiedLabel : label}
    </button>
  );
}

const fmt = (n: number, ru: boolean) => n.toLocaleString(ru ? "ru-RU" : "en-US");

export default function BuildWizard({ data, locale = "ru" }: { data: BuildData; locale?: Locale }) {
  const ru = locale !== "en";
  const router = useRouter();
  const [step, setStep] = useState(FIRST_STEP);
  const [maxDone, setMaxDone] = useState(FIRST_STEP); // steps 0..maxDone-1 are done
  const [shots, setShots] = useState<{ file: File; url: string }[]>([]);
  const [compOpen, setCompOpen] = useState<number | null>(null);
  const showResults = step === LAST_STEP;

  // Bookmarks: same localStorage list the ideas deck and /saved use, so the
  // assembled plan lands in the shared favorites (FavSync merges to account).
  type Saved = { slug: string; category: string; categoryName: string; title: string; oneLiner: string };
  const [savedList, setSavedList] = useState<Saved[]>([]);
  const saved = useMemo(() => savedList.some((s) => s.slug === data.ideaSlug), [savedList, data.ideaSlug]);
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      try { const s = JSON.parse(localStorage.getItem("feed:saved") || "[]"); if (Array.isArray(s)) setSavedList(s); } catch {}
    });
    return () => cancelAnimationFrame(id);
  }, []);
  const toggleSaved = () => {
    const next = saved
      ? savedList.filter((s) => s.slug !== data.ideaSlug)
      : [{ slug: data.ideaSlug, category: data.nicheSlug, categoryName: data.nicheName, title: data.ideaTitle, oneLiner: data.oneLiner }, ...savedList];
    setSavedList(next);
    try { localStorage.setItem("feed:saved", JSON.stringify(next.slice(0, 100))); } catch {}
  };

  // Lock background scroll while the competitor sheet is open.
  useEffect(() => {
    if (compOpen == null) return;
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    return () => { html.style.overflow = prev; };
  }, [compOpen]);

  const next = () => {
    setMaxDone((d) => Math.max(d, step + 1));
    if (step < LAST_STEP) setStep(step + 1);
  };
  const back = () => {
    if (step <= FIRST_STEP) router.push(data.hrefBack);
    else setStep(step - 1);
  };
  const goTo = (i: number) => {
    if (i === 0) router.push(data.hrefNiches);
    else if (i === 1) router.push(data.hrefBack);
    else setStep(i);
  };

  const addShots = (files: FileList | null) => {
    if (!files) return;
    const add = Array.from(files).slice(0, 8 - shots.length).map((f) => ({ file: f, url: URL.createObjectURL(f) }));
    if (add.length) setShots((s) => [...s, ...add]);
  };

  // One archive with the whole plan: the summary, every design message, the
  // code brief and the user's rendered screens (if uploaded).
  const downloadPlan = async () => {
    const enc = new TextEncoder();
    const md = [
      `# ${data.ideaTitle}`,
      "",
      data.oneLiner,
      "",
      `${ru ? "Ниша" : "Niche"}: ${data.nicheName}`,
      data.founder100 != null ? `${ru ? "Оценка для соло-фаундера" : "Solo-founder score"}: ${data.founder100}/100` : "",
      "",
      `## ${ru ? "Боль" : "Pain"}`,
      data.painLine,
      data.painQuote ? `\n> ${data.painQuote.quote}\n> (${data.painQuote.app})` : "",
      "",
      `## ${ru ? "Решение" : "Solution"}`,
      data.pitch ?? "",
      ...data.features.map((f) => `- ${f}`),
      "",
      `## ${ru ? "Конкуренты" : "Competitors"}`,
      ...data.competitors.map((c) => `- ${c.title} (${fmt(c.ratings, ru)} ${ru ? "оценок" : "ratings"}). ${ru ? "Слабое место" : "Weak spot"}: ${c.weak}`),
      "",
      `## ${ru ? "Кто платит" : "Who pays"}`,
      data.buyer ?? "",
      data.pay ?? "",
      data.pricePoint ? `${ru ? "Ценник в нише" : "Niche price point"}: ${data.pricePoint}` : "",
      data.risk ? `${ru ? "Главный риск" : "Main risk"}: ${data.risk}` : "",
      "",
      `## ${ru ? "Имя и ASO" : "Name & ASO"}`,
      data.aso.namingHint,
      ...(data.aso.live.length
        ? data.aso.live.map((t) => `- "${t.term}"${t.hintRank ? ` (${ru ? "автоподсказка №" : "autocomplete #"}${t.hintRank})` : ""}: ${ru ? "медиана топ-10" : "top-10 median"} ${fmt(t.median, ru)}, ${ru ? "минимум в топе" : "smallest in top"} ${fmt(t.min, ru)}`)
        : data.aso.terms.map((t) => `- ${t}`)),
      "",
      `## ${ru ? "Каналы запуска" : "Launch channels"}`,
      ...data.channels.map((c) => `- ${c.name}: ${c.note}`),
      "",
      ru
        ? "Как собирать: сообщения из design/ вставляй в ChatGPT по порядку (свои картинки прикладывай к первому), бриф из code/ отдай Cursor или Claude Code первым сообщением."
        : "How to build: paste design/ messages into ChatGPT in order (attach your renders to the first one), give the code/ brief to Cursor or Claude Code as the first message.",
    ].filter((l) => l !== "").join("\n");

    const files: ZipFile[] = [
      { name: "plan.md", data: enc.encode(md) },
      ...data.design.parts.map((p, i) => ({ name: `design/message-${i + 1}.txt`, data: enc.encode(p) })),
      { name: "code/brief.txt", data: enc.encode(data.codePrompt) },
    ];
    for (let i = 0; i < shots.length; i++) {
      const f = shots[i].file;
      const ext = (f.name.split(".").pop() || "png").toLowerCase();
      files.push({ name: `shots/shot-${i + 1}.${ext}`, data: new Uint8Array(await f.arrayBuffer()) });
    }
    downloadZip(files, `${data.ideaSlug}-plan.zip`);
  };

  return (
    <div className="mx-auto w-full max-w-[720px]">
      <BuildProgress active={step} doneCount={maxDone} ru={ru} onStep={goTo} />

      {step === 2 && (
        <section className="mt-8">
          <h2 className="text-title2 text-[var(--color-text-primary)]">{ru ? "Мы уже придумали, как это решить" : "We already worked out how to solve it"}</h2>
          <p className="mt-3 max-w-[56ch] text-callout text-[var(--color-text-secondary)]">
            {ru ? "Смотри: вот твоя боль, и вот продукт, который её закрывает. Механика выведена из отзывов, спрос посчитан, простота оценена под одного человека." : "Look: here is your pain, and here is the product that closes it. Mechanics derived from reviews, demand counted, buildability scored for one person."}
          </p>

          <div className="heal-card mt-7 rounded-[24px] p-6">
            <div className="flex items-center gap-2.5">
              <FlameIcon size={18} />
              <span className="text-caption font-semibold text-[var(--color-text-tertiary)]">{ru ? "Боль, которую лечим" : "The pain we treat"}</span>
              <span className="heal-pop ml-auto inline-flex items-center gap-1.5 rounded-full bg-[#30d158]/15 px-3 py-1 text-caption font-bold text-[#1f9d47]" style={{ animationDelay: "1.5s" }}>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3.5 8.5 6.5 11.5 12.5 4.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                {ru ? "решаемо" : "treatable"}
              </span>
            </div>
            <p className="mt-3 text-body text-pretty text-[var(--color-text-primary)]">{data.painLine}</p>
            {data.painQuote && (
              <figure className="mt-4 border-t border-[var(--color-border-subtle)] pt-3">
                <p className="text-footnote italic text-[var(--color-text-secondary)]">{data.painQuote.quote}</p>
                <figcaption className="mt-1 text-caption not-italic text-[var(--color-text-tertiary)]">{data.painQuote.app}</figcaption>
              </figure>
            )}
          </div>

          <div className="heal-rise mt-4 flex items-center justify-center gap-2 text-caption font-semibold text-[var(--color-text-tertiary)]" style={{ animationDelay: "1.7s" }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 3v10M4 9l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            {ru ? "наше решение" : "our solution"}
          </div>

          <div className="heal-rise card-min mt-4 rounded-[24px] p-7" style={{ animationDelay: "1.9s" }}>
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-title3 text-pretty text-[var(--color-text-primary)]">{data.ideaTitle}</h3>
              {data.founder100 != null && (
                <span className="shrink-0 rounded-full bg-[var(--color-accent-brand)] px-3 py-1.5 text-caption font-bold tabular-nums text-white">{data.founder100}/100</span>
              )}
            </div>
            <p className="mt-3 text-body text-[var(--color-text-secondary)]">{data.oneLiner}</p>
            {data.pitch && <p className="mt-3 text-callout text-[var(--color-text-secondary)]">{data.pitch}</p>}
            {data.features.length > 0 && (
              <ul className="mt-5 flex flex-col gap-2.5 border-t border-[var(--color-border-subtle)] pt-5">
                {data.features.slice(0, 5).map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-callout text-[var(--color-text-secondary)]">
                    <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true" className="mt-0.5 shrink-0 text-[#30d158]"><circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeWidth="1.4" /><path d="M5.8 9.2l2.1 2.1 4.3-4.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    {f}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="mt-8">
          <h2 className="text-title2 text-[var(--color-text-primary)]">{ru ? "Кто уже в нише и где у них дыры" : "Who is already here and where they leak"}</h2>
          <p className="mt-3 max-w-[56ch] text-callout text-[var(--color-text-secondary)]">
            {ru ? "Топ ниши по массе оценок. Их слабые места мы вытащили из отзывов, и это твой вход: людям уже есть с чем сравнивать." : "The niche's top by rating mass. Their weak spots come from the reviews, and that is your way in: people already have something to compare with."}
          </p>
          <div className="mt-7 flex flex-col gap-3">
            {data.competitors.map((c, i) => (
              <button key={i} type="button" onClick={() => setCompOpen(i)} className="card-min group rounded-[22px] p-5 text-left transition-colors hover:border-[var(--color-border-strong)]">
                <div className="flex items-center gap-3.5">
                  {c.icon
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={c.icon} alt="" loading="lazy" decoding="async" className="size-11 shrink-0 rounded-[13px] object-cover ring-1 ring-[var(--color-border-subtle)]" />
                    : <span className="size-11 shrink-0 rounded-[13px] bg-[var(--color-bg-muted)]" />}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-body font-semibold text-[var(--color-text-primary)]">{c.title}</div>
                    <div className="mt-0.5 text-caption tabular-nums text-[var(--color-text-tertiary)]">{fmt(c.ratings, ru)} {ru ? "оценок" : "ratings"}{c.realScore != null ? ` · ${ru ? "честный балл" : "honest score"} ${c.realScore}` : ""}</div>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 text-caption font-semibold text-[var(--color-text-tertiary)] transition-colors group-hover:text-[var(--color-text-primary)]">
                    {ru ? "смотреть" : "view"}
                    <svg width="13" height="13" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M6 4l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </span>
                </div>
                {c.weak && (
                  <p className="mt-3 rounded-[14px] bg-[#ff453a]/8 px-4 py-3 text-callout text-[var(--color-text-secondary)]">
                    <span className="font-semibold text-[#d70015]">{ru ? "Слабое место: " : "Weak spot: "}</span>{c.weak}
                  </p>
                )}
              </button>
            ))}
          </div>
          {data.pitch && (
            <div className="card-min mt-4 flex items-start gap-3.5 rounded-[22px] border-[#30d158]/35 bg-[#30d158]/8 p-5">
              <span className="mt-0.5 shrink-0"><BulbIcon size={20} /></span>
              <div>
                <div className="text-caption font-semibold text-[#1f9d47]">{ru ? "Твой обход" : "Your way around them"}</div>
                <p className="mt-1.5 text-callout text-[var(--color-text-secondary)]">{data.pitch}</p>
              </div>
            </div>
          )}
        </section>
      )}

      {step === 4 && (
        <section className="mt-8">
          <h2 className="text-title2 text-[var(--color-text-primary)]">{ru ? "Кто заплатит и сколько" : "Who pays and how much"}</h2>
          <p className="mt-3 max-w-[56ch] text-callout text-[var(--color-text-secondary)]">{ru ? "Мы не гадаем: платящий найден в отзывах, ценник взят из того, что люди уже платят в нише." : "No guessing: the payer was found in the reviews, the price anchored to what people already pay in the niche."}</p>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            {data.buyer && (
              <div className="card-min rounded-[22px] p-6">
                <div className="text-caption font-semibold text-[var(--color-text-tertiary)]">{ru ? "Твой платящий" : "Your payer"}</div>
                <p className="mt-2 text-title3 text-pretty text-[var(--color-text-primary)]">{data.buyer}</p>
              </div>
            )}
            {data.pricePoint && (
              <div className="card-min rounded-[22px] p-6">
                <div className="text-caption font-semibold text-[var(--color-text-tertiary)]">{ru ? "Ценник в нише" : "Niche price point"}</div>
                <p className="mt-2 text-stat tabular-nums text-[var(--color-text-primary)]">{data.pricePoint}</p>
                <p className="mt-1 text-caption text-[var(--color-text-tertiary)]">{ru ? "столько люди уже платят за решение этой боли" : "what people already pay to solve this pain"}</p>
              </div>
            )}
          </div>
          {data.pay && (
            <div className="card-min mt-3 rounded-[22px] p-6">
              <div className="text-caption font-semibold text-[var(--color-text-tertiary)]">{ru ? "Почему заплатит" : "Why they will pay"}</div>
              <p className="mt-2 text-body text-[var(--color-text-secondary)]">{data.pay}</p>
            </div>
          )}
          {data.risk && (
            <div className="card-min mt-3 rounded-[22px] border-[#ff9500]/40 bg-[#ff9500]/8 p-6">
              <div className="text-caption font-semibold text-[#c25e00]">{ru ? "Честно про главный риск" : "Honestly about the main risk"}</div>
              <p className="mt-2 text-callout text-[var(--color-text-secondary)]">{data.risk}</p>
            </div>
          )}
        </section>
      )}

      {step === 5 && (
        <section className="mt-8">
          <h2 className="text-title2 text-[var(--color-text-primary)]">{ru ? "Как тебя найдут в сторе" : "How they will find you"}</h2>
          <p className="mt-3 max-w-[56ch] text-callout text-[var(--color-text-secondary)]">
            {ru
              ? "Каждое слово мы проверили прямо в App Store. Смотрели две вещи: подсказывает ли его стор при вводе (значит люди правда так ищут) и насколько занят топ по этому слову."
              : "We checked every word right in the App Store. Two things: does the store suggest it while typing (so people really search it) and how occupied the top is for it."}
          </p>
          {data.aso.live.length > 0 ? (
            <div className="mt-7 flex flex-col gap-2.5">
              {data.aso.live.map((t, i) => {
                const tier = t.min <= 0 ? "none" : t.min < 20000 ? "open" : t.min < 100000 ? "mid" : "giants";
                const dot = tier === "open" ? "bg-[#30d158]" : tier === "mid" ? "bg-[#ff9500]" : tier === "giants" ? "bg-[#ff453a]" : "bg-[var(--color-border-strong)]";
                const label = ru
                  ? tier === "open" ? "новичку можно" : tier === "mid" ? "плотно, но реально" : tier === "giants" ? "топ у гигантов" : "мало данных"
                  : tier === "open" ? "newcomer friendly" : tier === "mid" ? "tight but doable" : tier === "giants" ? "giants own the top" : "little data";
                const explain = ru
                  ? tier === "open"
                    ? <>В десятке уже есть приложение всего с <span className="tabular-nums font-semibold">{fmt(t.min, ru)}</span> оценками. Столько реально набрать, встанешь рядом.</>
                    : tier === "mid"
                      ? <>У самого маленького в десятке <span className="tabular-nums font-semibold">{fmt(t.min, ru)}</span> оценок. Пробиться можно, но не с первого дня.</>
                      : tier === "giants"
                        ? <>Вся десятка у больших: даже у самого маленького <span className="tabular-nums font-semibold">{fmt(t.min, ru)}</span> оценок. Не бери это слово первым.</>
                        : <>По этому запросу мало данных о выдаче.</>
                  : tier === "open"
                    ? <>The top-10 already has an app with just <span className="tabular-nums font-semibold">{fmt(t.min, ru)}</span> ratings. That is a reachable number, you can stand next to it.</>
                    : tier === "mid"
                      ? <>The smallest app in the top-10 has <span className="tabular-nums font-semibold">{fmt(t.min, ru)}</span> ratings. Possible, but not from day one.</>
                      : tier === "giants"
                        ? <>The whole top-10 is big players: even the smallest has <span className="tabular-nums font-semibold">{fmt(t.min, ru)}</span> ratings. Do not lead with this word.</>
                        : <>Little results data for this query.</>;
                return (
                  <div key={i} className="card-min rounded-[20px] p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-bg-muted)] px-3.5 py-1.5 text-callout font-semibold text-[var(--color-text-primary)]">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-[var(--color-text-tertiary)]"><circle cx="10.5" cy="10.5" r="6.2" stroke="currentColor" strokeWidth="2.2" /><path d="m18.6 18.6-3.5-3.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
                        {t.term}
                      </span>
                      {t.hintRank != null && (
                        <span className="rounded-full bg-[#0a84ff]/12 px-2.5 py-1 text-caption font-bold text-[#0a84ff]">{ru ? `стор подсказывает его №${t.hintRank}` : `store suggests it #${t.hintRank}`}</span>
                      )}
                    </div>
                    <div className="mt-2.5 flex items-start gap-2">
                      <span className={`mt-[5px] size-2.5 shrink-0 rounded-full ${dot}`} />
                      <div className="text-footnote text-[var(--color-text-secondary)]">
                        <span className="font-bold text-[var(--color-text-primary)]">{label}.</span> {explain}
                      </div>
                    </div>
                    {t.top[0] && <div className="mt-1.5 pl-[18px] text-caption text-[var(--color-text-tertiary)]">{ru ? "первый в выдаче: " : "first result: "}{t.top[0].title}</div>}
                  </div>
                );
              })}
            </div>
          ) : (
            data.aso.terms.length > 0 && (
              <div className="mt-7 flex flex-wrap gap-2">
                {data.aso.terms.map((t, i) => (
                  <span key={i} className="rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] px-3.5 py-2 text-callout font-medium text-[var(--color-text-primary)]">{t}</span>
                ))}
              </div>
            )
          )}
          <div className="card-min mt-5 rounded-[22px] p-6">
            <div className="text-caption font-semibold text-[var(--color-text-tertiary)]">{ru ? "Подсказка для имени" : "Naming hint"}</div>
            <p className="mt-2 text-callout text-[var(--color-text-secondary)]">{data.aso.namingHint}</p>
          </div>
          {data.competitors.length > 0 && (
            <div className="card-min mt-3 rounded-[22px] p-6">
              <div className="text-caption font-semibold text-[var(--color-text-tertiary)]">{ru ? "Не зови себя как они (топ уже занят)" : "Do not name yourself like these (the top is taken)"}</div>
              <div className="mt-3 flex flex-col gap-2">
                {data.competitors.map((c, i) => (
                  <div key={i} className="flex items-baseline justify-between gap-3 text-callout"><span className="text-[var(--color-text-primary)]">{c.title}</span><span className="text-caption tabular-nums text-[var(--color-text-tertiary)]">{fmt(c.ratings, ru)} {ru ? "оценок" : "ratings"}</span></div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* The plan: a keynote. The whole road retold as presentation slides,
          dark cards one under another, ending with the archive and bookmark. */}
      {showResults && (() => {
        const sub = "text-[color-mix(in_srgb,var(--color-bg-page)_58%,transparent)]";
        const body = "text-[color-mix(in_srgb,var(--color-bg-page)_78%,transparent)]";
        const inner = "rounded-[18px] bg-[color-mix(in_srgb,var(--color-bg-page)_9%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--color-bg-page)_14%,transparent)]";
        const slide = "card-fade rounded-[28px] bg-[var(--color-text-primary)] p-7 sm:p-8";
        const kicker = (Icon: (p: { size?: number }) => React.ReactNode, t: string) => (
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-bg-page)_12%,transparent)]">{Icon({ size: 18 })}</span>
            <span className={`text-caption font-semibold ${sub}`}>{t}</span>
          </div>
        );
        const d = (k: number) => ({ animationDelay: `${120 + k * 130}ms` });
        return (
          <div className="mt-10 flex flex-col gap-4">
            {/* Cover */}
            <section className={slide} style={d(0)}>
              <div className={`text-caption font-semibold ${sub}`}>{ru ? "Презентация твоего приложения" : "Your app's presentation"}</div>
              <h2 className="mt-2 text-title1 text-balance text-[var(--color-bg-page)]">{data.ideaTitle}</h2>
              <p className={`mt-3 max-w-[54ch] text-lead text-pretty ${body}`}>{data.oneLiner}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-3 py-1.5 text-caption font-semibold ${inner} ${body}`}>{data.nicheName}</span>
                {data.founder100 != null && <span className="rounded-full bg-[var(--color-accent-brand)] px-3 py-1.5 text-caption font-bold tabular-nums text-white">{ru ? "для соло-фаундера" : "solo-founder score"} {data.founder100}/100</span>}
              </div>
              {shots.length > 0 && (
                <div className="mt-6 flex gap-4 overflow-x-auto pb-2">
                  {shots.map((sh, i) => (
                    <div key={i} className="w-[148px] shrink-0 overflow-hidden rounded-[26px] bg-black ring-4 ring-black/70 shadow-[0_18px_44px_-16px_rgba(0,0,0,0.7)]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={sh.url} alt="" className="aspect-[9/19] w-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-6 flex flex-wrap items-center gap-2.5">
                <button type="button" onClick={downloadPlan} className="inline-flex items-center gap-2 rounded-full bg-[var(--color-bg-page)] px-5 py-3 text-callout font-bold text-[var(--color-text-primary)] transition-transform hover:scale-[1.02] active:scale-[0.99]">
                  <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10 3v9M6 9l4 4 4-4M4 16h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  {ru ? "Скачать план архивом" : "Download the plan"}
                </button>
                <button type="button" onClick={toggleSaved} className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-callout font-bold transition-colors ${inner} ${saved ? "text-[#ffd60a]" : body}`}>
                  <svg width="15" height="15" viewBox="0 0 20 20" fill={saved ? "currentColor" : "none"} aria-hidden="true"><path d="M5.5 3.5h9a1 1 0 0 1 1 1v12l-5.5-3.4L4.5 16.5v-12a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>
                  {saved ? (ru ? "В избранном" : "Saved") : (ru ? "В избранное" : "Save")}
                </button>
              </div>
            </section>

            {/* Pain */}
            <section className={slide} style={d(1)}>
              {kicker((p) => <FlameIcon {...p} />, ru ? "Боль" : "The pain")}
              <p className="mt-4 text-title3 text-pretty text-[var(--color-bg-page)]">{data.painLine}</p>
              {data.painQuote && (
                <figure className={`mt-5 px-4 py-3 ${inner}`}>
                  <p className={`text-callout italic ${body}`}>{data.painQuote.quote}</p>
                  <figcaption className={`mt-1 text-caption not-italic ${sub}`}>{data.painQuote.app}</figcaption>
                </figure>
              )}
            </section>

            {/* Solution */}
            <section className={slide} style={d(2)}>
              {kicker((p) => <BulbIcon {...p} />, ru ? "Решение" : "The solution")}
              {data.pitch && <p className={`mt-4 max-w-[56ch] text-body ${body}`}>{data.pitch}</p>}
              {data.features.length > 0 && (
                <ul className="mt-5 flex flex-col gap-2.5">
                  {data.features.slice(0, 5).map((f, i) => (
                    <li key={i} className={`flex items-start gap-2.5 text-callout ${body}`}>
                      <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true" className="mt-0.5 shrink-0 text-[#30d158]"><circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeWidth="1.4" /><path d="M5.8 9.2l2.1 2.1 4.3-4.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      {f}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Competitors */}
            <section className={slide} style={d(3)}>
              {kicker((p) => <SwordsIcon {...p} />, ru ? "Конкуренты и твой обход" : "Competitors and your way in")}
              <div className="mt-4 flex flex-col gap-2.5">
                {data.competitors.map((c, i) => (
                  <div key={i} className={`flex items-start gap-3 px-4 py-3 ${inner}`}>
                    {c.icon
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={c.icon} alt="" loading="lazy" decoding="async" className="size-9 shrink-0 rounded-[10px] object-cover" />
                      : <span className="size-9 shrink-0 rounded-[10px] bg-[color-mix(in_srgb,var(--color-bg-page)_14%,transparent)]" />}
                    <div className="min-w-0">
                      <div className="text-callout font-semibold text-[var(--color-bg-page)]">{c.title} <span className={`ml-1 text-caption font-medium tabular-nums ${sub}`}>{fmt(c.ratings, ru)} {ru ? "оценок" : "ratings"}</span></div>
                      {c.weak && <p className={`mt-0.5 text-footnote ${body}`}><span className="font-semibold text-[#ff6961]">{ru ? "слабое место: " : "weak spot: "}</span>{c.weak}</p>}
                    </div>
                  </div>
                ))}
              </div>
              {data.pitch && <p className={`mt-4 text-callout ${body}`}><span className="font-semibold text-[#30d158]">{ru ? "Твой обход: " : "Your way around: "}</span>{data.pitch}</p>}
            </section>

            {/* Who pays */}
            <section className={slide} style={d(4)}>
              {kicker((p) => <CoinIcon {...p} />, ru ? "Кто платит" : "Who pays")}
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {data.buyer && (
                  <div className={`px-5 py-4 ${inner}`}>
                    <div className={`text-caption font-semibold ${sub}`}>{ru ? "Твой платящий" : "Your payer"}</div>
                    <p className="mt-1.5 text-body font-semibold text-[var(--color-bg-page)]">{data.buyer}</p>
                  </div>
                )}
                {data.pricePoint && (
                  <div className={`px-5 py-4 ${inner}`}>
                    <div className={`text-caption font-semibold ${sub}`}>{ru ? "Ценник в нише" : "Price point"}</div>
                    <p className="mt-1.5 text-title2 tabular-nums text-[var(--color-bg-page)]">{data.pricePoint}</p>
                  </div>
                )}
              </div>
              {data.pay && <p className={`mt-4 max-w-[56ch] text-callout ${body}`}>{data.pay}</p>}
              {data.risk && <p className={`mt-3 max-w-[56ch] text-footnote ${sub}`}><span className="font-semibold text-[#ff9500]">{ru ? "главный риск: " : "main risk: "}</span>{data.risk}</p>}
            </section>

            {/* Name & ASO */}
            <section className={slide} style={d(5)}>
              {kicker((p) => <SearchAnimIcon {...p} />, ru ? "Имя и запросы в сторе" : "Name and store queries")}
              <p className={`mt-4 max-w-[56ch] text-callout ${body}`}>{data.aso.namingHint}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {(data.aso.live.length ? data.aso.live.map((l) => l.term) : data.aso.terms).slice(0, 8).map((x, j) => (
                  <span key={j} className={`rounded-full px-3 py-1.5 text-caption font-semibold ${inner} ${body}`}>{x}</span>
                ))}
              </div>
            </section>

            {/* Design */}
            <section className={slide} style={d(6)}>
              {kicker((p) => <PaletteIcon {...p} />, ru ? "Дизайн: нарисуй экраны в ChatGPT" : "Design: render the screens in ChatGPT")}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                {data.design.palette && (
                  <span className="flex gap-1.5">
                    {[data.design.palette.bg, data.design.palette.surface, data.design.palette.accent, data.design.palette.textPrimary].map((c, i) => (
                      <span key={i} className="size-8 rounded-[9px] ring-1 ring-[color-mix(in_srgb,var(--color-bg-page)_20%,transparent)]" style={{ background: c }} />
                    ))}
                  </span>
                )}
                <span className={`text-footnote ${sub}`}>
                  {data.design.hasSpec
                    ? <>{data.design.theme === "dark" ? (ru ? "тёмная тема" : "dark theme") : (ru ? "светлая тема" : "light theme")} · {data.design.screens} {ru ? "экранов" : "screens"} · {data.design.parts.length} {ru ? "сообщений по порядку" : "messages in order"}</>
                    : (ru ? "универсальный дизайн-бриф" : "universal design brief")}
                </span>
              </div>
              <p className={`mt-4 max-w-[56ch] text-footnote ${sub}`}>
                {ru ? "Каждый телефончик — одно сообщение в ChatGPT. Копируй промт под ним, вставляй в чат, и картинка займёт своё место." : "Each little phone is one ChatGPT message. Copy the prompt under it, paste into the chat, and the render takes its place."}
              </p>
              <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
                {data.design.parts.map((p, i) => (
                  <div key={i} className="flex w-[124px] shrink-0 flex-col items-center gap-2.5">
                    {shots[i] ? (
                      <div className="w-full overflow-hidden rounded-[22px] bg-black ring-4 ring-black/70">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={shots[i].url} alt="" className="aspect-[9/19] w-full object-cover" />
                      </div>
                    ) : (
                      <div className="flex aspect-[9/19] w-full flex-col items-center justify-center gap-2 rounded-[22px] border-2 border-dashed border-[color-mix(in_srgb,var(--color-bg-page)_30%,transparent)]">
                        <PaletteIcon size={20} />
                        <span className={`px-2 text-center text-caption ${sub}`}>{i === 0 ? (ru ? "стиль" : "style") : `${ru ? "экраны" : "screens"} ${i}`}</span>
                      </div>
                    )}
                    <CopyBtn text={p} label={`${ru ? "Промт" : "Prompt"} ${i + 1}`} copiedLabel={ru ? "Скопировано" : "Copied"} />
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-[18px] border border-dashed border-[color-mix(in_srgb,var(--color-bg-page)_28%,transparent)] p-4">
                <p className={`text-footnote ${body}`}>
                  {ru ? "Когда ChatGPT нарисует экраны, загрузи картинки сюда: они встанут в обложку презентации и в архив плана. Всё остаётся у тебя на устройстве." : "When ChatGPT renders the screens, upload them here: they go into the presentation cover and the plan archive. Everything stays on your device."}
                </p>
                <label className={`mt-3 inline-flex cursor-pointer items-center gap-2 rounded-full px-4 py-2.5 text-callout font-medium transition-opacity hover:opacity-85 ${inner} ${body}`}>
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
                  {ru ? "Загрузить картинки" : "Upload images"}
                  <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { addShots(e.target.files); e.target.value = ""; }} />
                </label>
                {shots.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {shots.map((sh, i) => (
                      <span key={i} className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={sh.url} alt="" className="h-24 rounded-[10px]" />
                        <button type="button" aria-label={ru ? "Убрать" : "Remove"} onClick={() => setShots((arr) => arr.filter((_, j) => j !== i))} className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-[var(--color-bg-page)] text-[10px] font-bold text-[var(--color-text-primary)]">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Code */}
            <section className={slide} style={d(7)}>
              {kicker((p) => <CodeIcon {...p} />, ru ? "Код: бриф для агента готов" : "Code: the agent brief is ready")}
              <p className={`mt-4 max-w-[56ch] text-callout ${body}`}>
                {ru ? "Cursor или Claude Code, вставь целиком первым сообщением. Внутри стек, экраны из дизайн-спеки, модель данных и честный пейвол." : "Cursor or Claude Code, paste whole as the first message. Inside: the stack, screens from the design spec, data model and an honest paywall."}
                {shots.length > 0 && (ru ? " Прикрепи к брифу свои картинки экранов: агент соберёт интерфейс по ним." : " Attach your screen renders: the agent will build the UI after them.")}
              </p>
              <div className="mt-4"><CopyBtn text={data.codePrompt} label={ru ? "Скопировать бриф" : "Copy the brief"} copiedLabel={ru ? "Скопировано" : "Copied"} /></div>
            </section>

            {/* Launch */}
            <section className={slide} style={d(8)}>
              {kicker((p) => <RocketIcon {...p} />, ru ? "Запуск: первые пользователи" : "Launch: the first users")}
              <div className="mt-4 flex flex-col gap-2.5">
                {data.channels.map((c, i) => (
                  <div key={i} className={`flex items-start justify-between gap-4 px-4 py-3 ${inner}`}>
                    <div className="min-w-0">
                      <div className="text-callout font-semibold text-[var(--color-bg-page)]">{c.name}</div>
                      <p className={`mt-0.5 text-footnote ${body}`}>{c.note}</p>
                    </div>
                    <span className={`shrink-0 text-footnote tabular-nums ${sub}`}>{c.count}</span>
                  </div>
                ))}
                {!data.channels.length && <p className={`text-callout ${sub}`}>{ru ? "Явных каналов в отзывах этой ниши не нашлось, начни с запросов из слайда про имя." : "No explicit channels in this niche's reviews, start from the query slide."}</p>}
              </div>
              <p className={`mt-6 text-callout ${body}`}>
                {ru ? "Выглядит уже как продукт. Осталось собрать: по сути это Lean Canvas, только заполненный реальными отзывами, а не гипотезами." : "Already looks like a product. Now build it: this is basically a Lean Canvas, filled with real reviews instead of hypotheses."}
              </p>
            </section>
          </div>
        );
      })()}

      {/* Competitor sheet: the app up close without leaving the wizard. */}
      {compOpen != null && data.competitors[compOpen] && (() => {
        const c = data.competitors[compOpen]!;
        return (
          <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true">
            <button type="button" aria-label={ru ? "Закрыть" : "Close"} onClick={() => setCompOpen(null)} className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" />
            <div className="relative max-h-[88vh] w-full max-w-[560px] overflow-y-auto rounded-t-[28px] bg-[var(--color-bg-page)] p-6 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.6)] sm:rounded-[28px] sm:p-7">
              <button type="button" aria-label={ru ? "Закрыть" : "Close"} onClick={() => setCompOpen(null)} className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-full bg-[var(--color-bg-muted)] text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
              </button>
              <div className="flex items-center gap-4 pr-10">
                {c.icon
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={c.icon} alt="" className="size-14 shrink-0 rounded-[15px] object-cover ring-1 ring-[var(--color-border-subtle)]" />
                  : <span className="size-14 shrink-0 rounded-[15px] bg-[var(--color-bg-muted)]" />}
                <div className="min-w-0">
                  <div className="text-title3 text-[var(--color-text-primary)]">{c.title}</div>
                  <div className="mt-0.5 text-footnote tabular-nums text-[var(--color-text-tertiary)]">{fmt(c.ratings, ru)} {ru ? "оценок" : "ratings"}{c.realScore != null ? ` · ${ru ? "честный балл" : "honest score"} ${c.realScore}` : ""}</div>
                </div>
              </div>
              {c.verdict && <p className="mt-5 text-callout text-[var(--color-text-secondary)]">{c.verdict}</p>}
              {c.loved && (
                <p className="mt-4 rounded-[14px] bg-[#30d158]/10 px-4 py-3 text-callout text-[var(--color-text-secondary)]">
                  <span className="font-semibold text-[#1f9d47]">{ru ? "За что любят: " : "What they love: "}</span>{c.loved}
                </p>
              )}
              {c.weak && (
                <p className="mt-2.5 rounded-[14px] bg-[#ff453a]/8 px-4 py-3 text-callout text-[var(--color-text-secondary)]">
                  <span className="font-semibold text-[#d70015]">{ru ? "Слабое место: " : "Weak spot: "}</span>{c.weak}
                </p>
              )}
              {c.shots.length > 0 && (
                <div className="mt-5 flex gap-3 overflow-x-auto pb-1">
                  {c.shots.map((sh, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={sh} alt="" loading="lazy" decoding="async" className="h-56 shrink-0 rounded-[14px] ring-1 ring-[var(--color-border-subtle)]" />
                  ))}
                </div>
              )}
              <Link href={c.href} className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-[var(--color-text-primary)] px-5 py-3 text-callout font-semibold text-[var(--color-bg-page)] transition-opacity hover:opacity-90">
                {ru ? "Полная страница приложения" : "Full app page"}
                <svg width="14" height="14" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M6 4l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </Link>
            </div>
          </div>
        );
      })()}

      <div className="mt-10 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={back}
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] px-5 py-3.5 text-callout font-semibold text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
        >
          <svg width="15" height="15" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M11 4 6 9l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          {ru ? "Назад" : "Back"}
        </button>
        {!showResults && (
          <button
            type="button"
            onClick={next}
            className="btn-shimmer inline-flex items-center gap-2 rounded-full px-8 py-4 text-body font-bold text-white shadow-[0_12px_32px_-12px_color-mix(in_srgb,var(--color-accent-brand)_70%,transparent)] transition-transform hover:scale-[1.02] active:scale-[0.99]"
          >
            {step === LAST_STEP - 1 ? (ru ? "Собрать план" : "Assemble the plan") : (ru ? "Дальше" : "Continue")}
            <svg width="17" height="17" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M6 4l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        )}
      </div>
    </div>
  );
}
