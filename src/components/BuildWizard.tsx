"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n";
import BuildProgress from "./BuildProgress";
import { BUILD_ICONS, FlameIcon, BulbIcon, PaletteIcon, CodeIcon, RocketIcon } from "./BuildIcons";
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
  competitors: { title: string; icon: string | null; ratings: number; realScore?: number; weak: string }[];
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
  const showResults = step === LAST_STEP;

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
              <div key={i} className="card-min rounded-[22px] p-5">
                <div className="flex items-center gap-3.5">
                  {c.icon
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={c.icon} alt="" loading="lazy" decoding="async" className="size-11 shrink-0 rounded-[13px] object-cover ring-1 ring-[var(--color-border-subtle)]" />
                    : <span className="size-11 shrink-0 rounded-[13px] bg-[var(--color-bg-muted)]" />}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-body font-semibold text-[var(--color-text-primary)]">{c.title}</div>
                    <div className="mt-0.5 text-caption tabular-nums text-[var(--color-text-tertiary)]">{fmt(c.ratings, ru)} {ru ? "оценок" : "ratings"}{c.realScore != null ? ` · ${ru ? "честный балл" : "honest score"} ${c.realScore}` : ""}</div>
                  </div>
                </div>
                {c.weak && (
                  <p className="mt-3 rounded-[14px] bg-[#ff453a]/8 px-4 py-3 text-callout text-[var(--color-text-secondary)]">
                    <span className="font-semibold text-[#d70015]">{ru ? "Слабое место: " : "Weak spot: "}</span>{c.weak}
                  </p>
                )}
              </div>
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
              ? "Apple не публикует объёмы запросов, поэтому мы берём два честных сигнала прямо из App Store: автоподсказки показывают, что люди реально вводят, а выдача по запросу показывает, насколько топ занят."
              : "Apple publishes no search volumes, so we take two honest signals straight from the App Store: autocomplete shows what people really type, the results show how occupied the top is."}
          </p>
          {data.aso.live.length > 0 ? (
            <div className="mt-7 flex flex-col gap-2.5">
              {data.aso.live.map((t, i) => (
                <div key={i} className="card-min rounded-[20px] p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-body font-semibold text-[var(--color-text-primary)]">{t.term}</span>
                    {t.hintRank != null && (
                      <span className="rounded-full bg-[#0a84ff]/12 px-2.5 py-1 text-caption font-bold text-[#0a84ff]">{ru ? `автоподсказка №${t.hintRank}` : `autocomplete #${t.hintRank}`}</span>
                    )}
                    {t.min > 0 && t.min < 20000 && (
                      <span className="rounded-full bg-[#30d158]/15 px-2.5 py-1 text-caption font-bold text-[#1f9d47]">{ru ? "есть щель" : "there is a gap"}</span>
                    )}
                  </div>
                  <div className="mt-2 text-footnote text-[var(--color-text-secondary)]">
                    {ru
                      ? <>Топ-10 по запросу: медиана <span className="tabular-nums font-semibold">{fmt(t.median, ru)}</span> оценок, у самого маленького <span className="tabular-nums font-semibold">{fmt(t.min, ru)}</span>{t.min > 0 && t.min < 20000 ? ", значит новичку сюда реально пролезть" : ""}.</>
                      : <>Top-10 for the query: median <span className="tabular-nums font-semibold">{fmt(t.median, ru)}</span> ratings, the smallest has <span className="tabular-nums font-semibold">{fmt(t.min, ru)}</span>{t.min > 0 && t.min < 20000 ? ", so a newcomer can realistically squeeze in" : ""}.</>}
                  </div>
                  {t.top[0] && <div className="mt-1 text-caption text-[var(--color-text-tertiary)]">{ru ? "первый в выдаче: " : "first result: "}{t.top[0].title}</div>}
                </div>
              ))}
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

      {/* The plan: a recap road of the walked steps plus the three work items
          (design, code, launch), one downloadable archive and, if the user
          uploaded renders, a little presentation of their app. */}
      {showResults && (
        <div className="mt-10">
          <div className="card-fade rounded-[26px] bg-[var(--color-text-primary)] p-8 text-center">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-bg-page)_12%,transparent)]"><RocketIcon size={34} /></div>
            <div className="mt-4 text-title1 text-[var(--color-bg-page)]">{ru ? "План приложения собран" : "Your app plan is ready"}</div>
            <p className="mx-auto mt-2 max-w-[44ch] text-callout text-[color-mix(in_srgb,var(--color-bg-page)_75%,transparent)]">
              {ru ? "Вся дорожка, которую ты прошёл, и три рабочих шага до приложения." : "The whole road you walked and three work items to the app."}
            </p>
            <button
              type="button"
              onClick={downloadPlan}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-[var(--color-bg-page)] px-6 py-3 text-callout font-bold text-[var(--color-text-primary)] transition-transform hover:scale-[1.02] active:scale-[0.99]"
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10 3v9M6 9l4 4 4-4M4 16h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              {ru ? `Скачать план архивом${shots.length ? " с картинками" : ""}` : `Download the plan as a zip${shots.length ? " with images" : ""}`}
            </button>
          </div>

          <div className="relative mt-6 flex flex-col gap-3 pl-6">
            <span aria-hidden className="absolute bottom-6 left-[10px] top-2 w-[2px] rounded-full bg-[var(--color-border-subtle)]" />
            {[
              { i: 0, t: ru ? "Ниша" : "Niche", body: <p className="text-body font-medium text-[var(--color-text-primary)]">{data.nicheName}</p> },
              { i: 1, t: ru ? "Боль" : "Pain", body: <p className="text-callout text-[var(--color-text-secondary)]">{data.painLine}</p> },
              { i: 2, t: ru ? "Решение" : "Solution", body: <div><p className="text-body font-medium text-[var(--color-text-primary)]">{data.ideaTitle}{data.founder100 != null && <span className="ml-2 rounded-full bg-[var(--color-accent-brand)] px-2 py-0.5 text-caption font-bold tabular-nums text-white">{data.founder100}/100</span>}</p><p className="mt-1 text-callout text-[var(--color-text-secondary)]">{data.oneLiner}</p></div> },
              { i: 3, t: ru ? "Конкуренты" : "Competitors", body: <p className="text-callout text-[var(--color-text-secondary)]">{data.competitors.map((c) => c.title).join(" · ")}</p> },
              { i: 4, t: ru ? "Кто платит" : "Who pays", body: <p className="text-callout text-[var(--color-text-secondary)]">{data.buyer}{data.pricePoint ? ` · ${data.pricePoint}` : ""}</p> },
              { i: 5, t: ru ? "Имя и ASO" : "Name & ASO", body: <div className="flex flex-wrap gap-1.5">{(data.aso.live.length ? data.aso.live.map((l) => l.term) : data.aso.terms).slice(0, 5).map((x, j) => <span key={j} className="rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] px-2.5 py-1 text-caption font-medium text-[var(--color-text-primary)]">{x}</span>)}</div> },
            ].map((row, k) => {
              const Icon = BUILD_ICONS[row.i];
              return (
                <div key={k} className="card-fade relative" style={{ animationDelay: `${150 + k * 110}ms` }}>
                  <span className="absolute -left-6 top-5 flex size-6 items-center justify-center rounded-full bg-[var(--color-bg-page)] ring-2 ring-[var(--color-border-subtle)]"><Icon size={14} /></span>
                  <div className="card-min ml-2 rounded-[20px] p-5">
                    <div className="text-caption font-semibold text-[var(--color-text-tertiary)]">{row.t}</div>
                    <div className="mt-1.5">{row.body}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <h3 className="card-fade mt-10 text-title2 text-[var(--color-text-primary)]" style={{ animationDelay: "0.9s" }}>{ru ? "Дальше три рабочих шага" : "Three work items left"}</h3>

          {/* Design */}
          <div className="card-fade card-min mt-5 rounded-[24px] p-6" style={{ animationDelay: "1s" }}>
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-full bg-[var(--color-bg-muted)]"><PaletteIcon size={22} /></span>
              <div>
                <div className="text-body font-semibold text-[var(--color-text-primary)]">{ru ? "1. Нарисуй экраны в ChatGPT" : "1. Render the screens in ChatGPT"}</div>
                <div className="text-caption text-[var(--color-text-tertiary)]">
                  {data.design.hasSpec
                    ? <>{data.design.theme === "dark" ? (ru ? "тёмная тема" : "dark theme") : (ru ? "светлая тема" : "light theme")} · {data.design.screens} {ru ? "экранов" : "screens"} · {data.design.parts.length} {ru ? "сообщений по порядку" : "messages in order"}</>
                    : (ru ? "универсальный дизайн-бриф" : "universal design brief")}
                </div>
              </div>
              {data.design.palette && (
                <span className="ml-auto flex gap-1">
                  {[data.design.palette.bg, data.design.palette.surface, data.design.palette.accent, data.design.palette.textPrimary].map((c, i) => (
                    <span key={i} className="size-7 rounded-[8px] ring-1 ring-[var(--color-border-subtle)]" style={{ background: c }} />
                  ))}
                </span>
              )}
            </div>
            <div className="mt-4 flex flex-col gap-2">
              {data.design.parts.map((p, i) => (
                <div key={i} className="flex items-center justify-between gap-3 rounded-[14px] bg-[var(--color-bg-muted)] px-4 py-3">
                  <span className="truncate text-callout text-[var(--color-text-secondary)]">{ru ? "Сообщение" : "Message"} {i + 1}{i === 0 ? (ru ? ": дизайн-система" : ": design system") : ""}</span>
                  <CopyBtn text={p} label={ru ? "Скопировать" : "Copy"} copiedLabel={ru ? "Скопировано" : "Copied"} />
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-[16px] border border-dashed border-[var(--color-border-strong)] p-4">
              <p className="text-footnote text-[var(--color-text-secondary)]">
                {ru ? "Когда ChatGPT нарисует экраны, загрузи картинки сюда: соберём их в архив плана и в презентацию твоего приложения. Всё остаётся у тебя на устройстве." : "When ChatGPT renders the screens, upload the images here: we bundle them into the plan archive and your app's presentation. Everything stays on your device."}
              </p>
              <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] px-4 py-2.5 text-callout font-medium text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]">
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
                {ru ? "Загрузить картинки" : "Upload images"}
                <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { addShots(e.target.files); e.target.value = ""; }} />
              </label>
              {shots.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {shots.map((s, i) => (
                    <span key={i} className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={s.url} alt="" className="h-24 rounded-[10px] ring-1 ring-[var(--color-border-subtle)]" />
                      <button type="button" aria-label={ru ? "Убрать" : "Remove"} onClick={() => setShots((arr) => arr.filter((_, j) => j !== i))} className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-[var(--color-text-primary)] text-[10px] font-bold text-[var(--color-bg-page)]">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Code */}
          <div className="card-fade card-min mt-3 rounded-[24px] p-6" style={{ animationDelay: "1.1s" }}>
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-full bg-[var(--color-bg-muted)]"><CodeIcon size={22} /></span>
              <div className="min-w-0">
                <div className="text-body font-semibold text-[var(--color-text-primary)]">{ru ? "2. Отдай бриф кодовому агенту" : "2. Hand the brief to a coding agent"}</div>
                <div className="text-caption text-[var(--color-text-tertiary)]">{ru ? "Cursor или Claude Code, вставь целиком первым сообщением" : "Cursor or Claude Code, paste whole as the first message"}</div>
              </div>
              <span className="ml-auto"><CopyBtn text={data.codePrompt} label={ru ? "Скопировать бриф" : "Copy the brief"} copiedLabel={ru ? "Скопировано" : "Copied"} /></span>
            </div>
            {shots.length > 0 && (
              <p className="mt-3 text-footnote text-[var(--color-text-secondary)]">{ru ? "Прикрепи к брифу свои картинки экранов: агент соберёт интерфейс по ним." : "Attach your screen renders to the brief: the agent will build the UI after them."}</p>
            )}
          </div>

          {/* Launch */}
          <div className="card-fade card-min mt-3 rounded-[24px] p-6" style={{ animationDelay: "1.2s" }}>
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-full bg-[var(--color-bg-muted)]"><RocketIcon size={22} /></span>
              <div>
                <div className="text-body font-semibold text-[var(--color-text-primary)]">{ru ? "3. Возьми первых пользователей" : "3. Get the first users"}</div>
                <div className="text-caption text-[var(--color-text-tertiary)]">{ru ? "каналы не из головы: люди сами пишут в отзывах, как нашли приложение" : "not guessed: people say in reviews how they found the app"}</div>
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-2.5">
              {data.channels.map((c, i) => (
                <div key={i} className="flex items-start justify-between gap-4 rounded-[14px] bg-[var(--color-bg-muted)] px-4 py-3">
                  <div className="min-w-0">
                    <div className="text-callout font-medium text-[var(--color-text-primary)]">{c.name}</div>
                    <p className="mt-0.5 text-footnote text-[var(--color-text-secondary)]">{c.note}</p>
                  </div>
                  <span className="shrink-0 text-footnote tabular-nums text-[var(--color-text-tertiary)]">{c.count}</span>
                </div>
              ))}
              {!data.channels.length && <p className="text-callout text-[var(--color-text-tertiary)]">{ru ? "Явных каналов в отзывах этой ниши не нашлось, начни с ASO-запросов из шага «Имя и ASO»." : "No explicit channels in this niche's reviews, start from the ASO queries."}</p>}
            </div>
          </div>

          {/* Presentation from the user's own renders. */}
          {shots.length > 0 && (
            <div className="card-fade mt-6 rounded-[26px] bg-[var(--color-text-primary)] p-7">
              <div className="text-caption font-semibold text-[color-mix(in_srgb,var(--color-bg-page)_60%,transparent)]">{ru ? "Презентация твоего приложения" : "Your app's presentation"}</div>
              <div className="mt-1 text-title2 text-[var(--color-bg-page)]">{data.ideaTitle}</div>
              <p className="mt-1 max-w-[52ch] text-callout text-[color-mix(in_srgb,var(--color-bg-page)_75%,transparent)]">{data.oneLiner}</p>
              <div className="mt-5 flex gap-4 overflow-x-auto pb-2">
                {shots.map((s, i) => (
                  <div key={i} className="w-[148px] shrink-0 overflow-hidden rounded-[26px] bg-black ring-4 ring-black/70 shadow-[0_18px_44px_-16px_rgba(0,0,0,0.7)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s.url} alt="" className="aspect-[9/19] w-full object-cover" />
                  </div>
                ))}
              </div>
              <p className="mt-3 text-footnote text-[color-mix(in_srgb,var(--color-bg-page)_60%,transparent)]">{ru ? "Выглядит уже как продукт. Осталось собрать." : "Already looks like a product. Now build it."}</p>
            </div>
          )}

          <p className="card-fade mt-8 text-center text-callout text-[var(--color-text-secondary)]" style={{ animationDelay: "1.3s" }}>
            {ru ? "По сути ты собрал Lean Canvas, только заполненный реальными отзывами, а не гипотезами. Дальше вечер с ChatGPT и Cursor. Возвращайся с приложением." : "You basically assembled a Lean Canvas, filled with real reviews instead of hypotheses. Next: an evening with ChatGPT and Cursor. Come back with an app."}
          </p>
        </div>
      )}

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
