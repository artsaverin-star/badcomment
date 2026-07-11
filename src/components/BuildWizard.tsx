"use client";

import { useState } from "react";
import type { Locale } from "@/lib/i18n";
import BuildProgress from "./BuildProgress";
import { BUILD_ICONS, RocketIcon } from "./BuildIcons";

// Admin prototype of the «Создай свой апп» builder path, steps 3-8 of 8
// (niche and pain were picked on the previous screens). Duolingo-flavored:
// one thought per screen, big friendly cards, a fat progress bar, confident
// copy backed by the data. Everything pre-assembled server-side.

export type BuildData = {
  ideaSlug: string;
  ideaTitle: string;
  oneLiner: string;
  nicheName: string;
  gap?: string;
  pitch?: string;
  features: string[];
  founder100?: number;
  pains: { quote: string; app: string }[];
  audience: { targetSegment?: string; whyPay?: string; pricePoint?: string; founderWhy?: string };
  aso: { terms: string[]; competitors: { title: string; ratings: number }[]; namingHint: string };
  design: { hasSpec: boolean; theme?: string; palette?: { bg: string; surface: string; accent: string; textPrimary: string }; motif?: string; screens: number; parts: string[] };
  codePrompt: string;
  channels: { name: string; note: string; count: number }[];
};

const FIRST_STEP = 2; // "Решение" — steps 0 (ниша) и 1 (боль) выбраны раньше
const LAST_STEP = 7;

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

export default function BuildWizard({ data, locale = "ru" }: { data: BuildData; locale?: Locale }) {
  const ru = locale !== "en";
  const [step, setStep] = useState(FIRST_STEP);
  const [maxDone, setMaxDone] = useState(FIRST_STEP); // steps 0..maxDone-1 are done
  const [shot, setShot] = useState<string | null>(null);
  const finished = maxDone > LAST_STEP;
  const showResults = finished && step === LAST_STEP;

  const next = () => {
    setMaxDone((d) => Math.max(d, step + 1));
    if (step < LAST_STEP) setStep(step + 1);
  };

  return (
    <div className="mx-auto w-full max-w-[720px]">
      <BuildProgress active={step} doneCount={maxDone} ru={ru} />

      <div className="mt-8" hidden={showResults}>
        {step === 2 && (
          <section>
            <h2 className="text-title2 text-[var(--color-text-primary)]">{ru ? "Мы уже придумали, как это решить" : "We already worked out how to solve it"}</h2>
            <p className="mt-3 max-w-[56ch] text-callout text-[var(--color-text-secondary)]">
              {ru ? "Не абстрактная идея, а продукт под проверенную боль: механика выведена из отзывов, спрос посчитан, простота оценена под одного человека." : "Not an abstract idea but a product built for a verified pain: mechanics derived from reviews, demand counted, buildability scored for one person."}
            </p>
            <div className="card-min mt-7 rounded-[24px] p-7">
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
            {data.pains.length > 0 && (
              <div className="mt-4 flex flex-col gap-2.5">
                {data.pains.slice(0, 2).map((p, i) => (
                  <figure key={i} className="max-w-[88%] self-start rounded-[18px] rounded-bl-[5px] bg-[var(--color-bg-muted)] px-4 py-3">
                    <p className="text-callout italic text-[var(--color-text-secondary)]">{p.quote}</p>
                    <figcaption className="mt-1 text-caption not-italic text-[var(--color-text-tertiary)]">{p.app}</figcaption>
                  </figure>
                ))}
              </div>
            )}
          </section>
        )}

        {step === 3 && (
          <section>
            <h2 className="text-title2 text-[var(--color-text-primary)]">{ru ? "Кто заплатит и почему" : "Who pays and why"}</h2>
            <p className="mt-3 max-w-[56ch] text-callout text-[var(--color-text-secondary)]">{ru ? "Мы не гадаем: платящий найден в отзывах, ценник взят из того, что люди уже платят в нише." : "No guessing: the payer was found in the reviews, the price anchored to what people already pay in the niche."}</p>
            <div className="mt-7 flex flex-col gap-3">
              {data.audience.targetSegment && (
                <div className="card-min rounded-[22px] p-6"><div className="text-caption text-[var(--color-text-tertiary)]">{ru ? "Твой платящий" : "Your payer"}</div><p className="mt-2 text-body text-[var(--color-text-primary)]">{data.audience.targetSegment}</p></div>
              )}
              {data.audience.whyPay && (
                <div className="card-min rounded-[22px] p-6"><div className="text-caption text-[var(--color-text-tertiary)]">{ru ? "Почему уже платит" : "Why they already pay"}</div><p className="mt-2 text-callout text-[var(--color-text-secondary)]">{data.audience.whyPay}</p></div>
              )}
              {data.audience.pricePoint && (
                <div className="card-min rounded-[22px] p-6"><div className="text-caption text-[var(--color-text-tertiary)]">{ru ? "Ценник" : "Price point"}</div><p className="mt-2 text-title3 tabular-nums text-[var(--color-text-primary)]">{data.audience.pricePoint}</p></div>
              )}
              {data.audience.founderWhy && (
                <div className="card-min rounded-[22px] p-6"><div className="text-caption text-[var(--color-text-tertiary)]">{ru ? "Решающий фактор" : "Decisive factor"}</div><p className="mt-2 text-callout text-[var(--color-text-secondary)]">{data.audience.founderWhy}</p></div>
              )}
            </div>
          </section>
        )}

        {step === 4 && (
          <section>
            <h2 className="text-title2 text-[var(--color-text-primary)]">{ru ? "Как тебя найдут в сторе" : "How they will find you"}</h2>
            <p className="mt-3 max-w-[56ch] text-callout text-[var(--color-text-secondary)]">{ru ? "Эти запросы люди реально вбивают в App Store, мы вытащили их из отзывов и поиска ниши. Дифференциатор должен быть виден прямо в названии." : "People really type these into the App Store, we pulled them from the niche's reviews and search. The differentiator must be visible in the name itself."}</p>
            {data.aso.terms.length > 0 && (
              <div className="mt-7 flex flex-wrap gap-2">
                {data.aso.terms.map((t, i) => (
                  <span key={i} className="rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] px-3.5 py-2 text-callout font-medium text-[var(--color-text-primary)]">{t}</span>
                ))}
              </div>
            )}
            <div className="card-min mt-6 rounded-[22px] p-6">
              <div className="text-caption text-[var(--color-text-tertiary)]">{ru ? "Подсказка для имени" : "Naming hint"}</div>
              <p className="mt-2 text-callout text-[var(--color-text-secondary)]">{data.aso.namingHint}</p>
            </div>
            {data.aso.competitors.length > 0 && (
              <div className="card-min mt-3 rounded-[22px] p-6">
                <div className="text-caption text-[var(--color-text-tertiary)]">{ru ? "Не зови себя как они (топ уже занят)" : "Do not name yourself like these (the top is taken)"}</div>
                <div className="mt-3 flex flex-col gap-2">
                  {data.aso.competitors.map((c, i) => (
                    <div key={i} className="flex items-baseline justify-between gap-3 text-callout"><span className="text-[var(--color-text-primary)]">{c.title}</span><span className="tabular-nums text-caption text-[var(--color-text-tertiary)]">{c.ratings.toLocaleString(ru ? "ru-RU" : "en-US")} {ru ? "оценок" : "ratings"}</span></div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {step === 5 && (
          <section>
            <h2 className="text-title2 text-[var(--color-text-primary)]">{ru ? "Нарисуй все экраны за вечер" : "Render every screen in one evening"}</h2>
            <p className="mt-3 max-w-[56ch] text-callout text-[var(--color-text-secondary)]">{ru ? "Наша студия уже спроектировала дизайн под эту идею: территория, палитра, все экраны. Вставляй сообщения в ChatGPT по порядку." : "Our studio already designed this idea: territory, palette, every screen. Paste the messages into ChatGPT in order."}</p>
            {data.design.palette && (
              <div className="card-min mt-7 flex items-center gap-4 rounded-[22px] p-6">
                <div className="flex gap-1.5">
                  {[data.design.palette.bg, data.design.palette.surface, data.design.palette.accent, data.design.palette.textPrimary].map((c, i) => (
                    <span key={i} className="size-9 rounded-[10px] ring-1 ring-[var(--color-border-subtle)]" style={{ background: c }} />
                  ))}
                </div>
                <div className="min-w-0">
                  <div className="text-callout font-medium text-[var(--color-text-primary)]">{data.design.theme === "dark" ? (ru ? "Тёмная тема" : "Dark theme") : (ru ? "Светлая тема" : "Light theme")} · {data.design.screens} {ru ? "экранов" : "screens"}</div>
                  {data.design.motif && <div className="mt-0.5 truncate text-caption text-[var(--color-text-tertiary)]">{data.design.motif}</div>}
                </div>
              </div>
            )}
            <div className="mt-4 flex flex-col gap-2.5">
              {data.design.parts.map((p, i) => (
                <div key={i} className="rounded-[16px] bg-[var(--color-bg-muted)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-caption font-semibold text-[var(--color-text-tertiary)]">{i === 0 ? (ru ? "Сообщение 1: дизайн-система" : "Message 1: design system") : `${ru ? "Сообщение" : "Message"} ${i + 1}`}</span>
                    <CopyBtn text={p} label={ru ? "Скопировать" : "Copy"} copiedLabel={ru ? "Скопировано" : "Copied"} />
                  </div>
                  <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap text-[12px] leading-[1.5] text-[var(--color-text-secondary)]">{p}</pre>
                </div>
              ))}
            </div>
            <div className="card-min mt-6 rounded-[22px] p-6">
              <div className="text-caption text-[var(--color-text-tertiary)]">{ru ? "Свой стиль (не обязательно)" : "Your own style (optional)"}</div>
              <p className="mt-2 text-callout text-[var(--color-text-secondary)]">{ru ? "Есть скрин приложения или мудборд, который нравится? Прикрепи его в ChatGPT вместе с первым сообщением и добавь: «используй этот скрин как стилевой референс»." : "Have a screenshot or moodboard you love? Attach it in ChatGPT with the first message and add: \"use this screenshot as the style reference\"."}</p>
              <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-full border border-dashed border-[var(--color-border-strong)] px-4 py-2.5 text-callout font-medium text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]">
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
                {ru ? "Загрузить свой скрин" : "Upload your screenshot"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setShot(URL.createObjectURL(f)); }} />
              </label>
              {shot && (
                <div className="mt-4 flex items-start gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={shot} alt="" className="max-h-48 rounded-[14px] ring-1 ring-[var(--color-border-subtle)]" />
                  <p className="text-footnote text-[var(--color-text-tertiary)]">{ru ? "Скрин остаётся у тебя на устройстве. Прикрепи его в ChatGPT сам, вместе с сообщением 1." : "The screenshot stays on your device. Attach it in ChatGPT yourself, with message 1."}</p>
                </div>
              )}
            </div>
          </section>
        )}

        {step === 6 && (
          <section>
            <h2 className="text-title2 text-[var(--color-text-primary)]">{ru ? "Код напишет агент, бриф уже готов" : "The agent writes the code, the brief is ready"}</h2>
            <p className="mt-3 max-w-[56ch] text-callout text-[var(--color-text-secondary)]">{ru ? "Стартовый бриф для Cursor или Claude Code: стек, экраны из дизайн-спеки, модель данных и честный пейвол. Вставь целиком первым сообщением." : "A starter brief for Cursor or Claude Code: stack, screens from the design spec, data model and an honest paywall. Paste it whole as the first message."}</p>
            <div className="mt-7 rounded-[16px] bg-[var(--color-bg-muted)] p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-caption font-semibold text-[var(--color-text-tertiary)]">{ru ? "Бриф для кодового агента" : "The coding-agent brief"}</span>
                <CopyBtn text={data.codePrompt} label={ru ? "Скопировать" : "Copy"} copiedLabel={ru ? "Скопировано" : "Copied"} />
              </div>
              <pre className="mt-2 max-h-[420px] overflow-auto whitespace-pre-wrap text-[12px] leading-[1.5] text-[var(--color-text-secondary)]">{data.codePrompt}</pre>
            </div>
          </section>
        )}

        {step === 7 && (
          <section>
            <h2 className="text-title2 text-[var(--color-text-primary)]">{ru ? "Где брать первых пользователей" : "Where the first users come from"}</h2>
            <p className="mt-3 max-w-[56ch] text-callout text-[var(--color-text-secondary)]">{ru ? "Каналы не из головы: люди сами пишут в отзывах, как нашли приложение. Мы их посчитали." : "Not guessed channels: people say in reviews how they found the app. We counted them."}</p>
            <div className="mt-7 flex flex-col gap-3">
              {data.channels.map((c, i) => (
                <div key={i} className="card-min flex items-start justify-between gap-4 rounded-[22px] p-6">
                  <div className="min-w-0">
                    <div className="text-body font-medium text-[var(--color-text-primary)]">{c.name}</div>
                    <p className="mt-1.5 text-callout text-[var(--color-text-secondary)]">{c.note}</p>
                  </div>
                  <span className="shrink-0 text-footnote tabular-nums text-[var(--color-text-tertiary)]">{c.count}</span>
                </div>
              ))}
              {!data.channels.length && <p className="text-callout text-[var(--color-text-tertiary)]">{ru ? "Явных каналов в отзывах этой ниши не нашлось, начни с ASO-запросов из шага «Имя и ASO»." : "No explicit channels in this niche's reviews, start from the ASO queries."}</p>}
            </div>
          </section>
        )}
      </div>

      {/* Results road: the last step is a full recap page — every step of the
          journey as an animated timeline row with its key artifact. */}
      {showResults && (
        <div className="mt-12">
          <div className="card-fade rounded-[26px] bg-[var(--color-text-primary)] p-8 text-center">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-bg-page)_12%,transparent)]"><RocketIcon size={34} /></div>
            <div className="mt-4 text-title1 text-[var(--color-bg-page)]">{ru ? "План приложения собран" : "Your app plan is ready"}</div>
            <p className="mx-auto mt-2 max-w-[44ch] text-callout text-[color-mix(in_srgb,var(--color-bg-page)_75%,transparent)]">
              {ru ? "Вот вся дорожка, которую ты прошёл, и артефакты каждого шага." : "Here is the whole road you walked and each step's artifact."}
            </p>
          </div>

          <div className="relative mt-6 flex flex-col gap-3 pl-6">
            <span aria-hidden className="absolute bottom-6 left-[10px] top-2 w-[2px] rounded-full bg-[var(--color-border-subtle)]" />
            {[
              { i: 0, t: ru ? "Ниша" : "Niche", body: <p className="text-body font-medium text-[var(--color-text-primary)]">{data.nicheName}</p> },
              { i: 1, t: ru ? "Боль" : "Pain", body: <p className="text-callout text-[var(--color-text-secondary)]">{data.gap}</p> },
              { i: 2, t: ru ? "Решение" : "Solution", body: <div><p className="text-body font-medium text-[var(--color-text-primary)]">{data.ideaTitle}{data.founder100 != null && <span className="ml-2 rounded-full bg-[var(--color-accent-brand)] px-2 py-0.5 text-caption font-bold tabular-nums text-white">{data.founder100}/100</span>}</p><p className="mt-1 text-callout text-[var(--color-text-secondary)]">{data.oneLiner}</p></div> },
              { i: 3, t: ru ? "Кто платит" : "Who pays", body: <p className="text-callout text-[var(--color-text-secondary)]">{data.audience.targetSegment}{data.audience.pricePoint ? ` · ${data.audience.pricePoint}` : ""}</p> },
              { i: 4, t: ru ? "Имя и ASO" : "Name & ASO", body: <div className="flex flex-wrap gap-1.5">{data.aso.terms.slice(0, 5).map((x, j) => <span key={j} className="rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] px-2.5 py-1 text-caption font-medium text-[var(--color-text-primary)]">{x}</span>)}</div> },
              { i: 5, t: ru ? "Дизайн" : "Design", body: <div className="flex items-center gap-3">{data.design.palette && <span className="flex gap-1">{[data.design.palette.bg, data.design.palette.surface, data.design.palette.accent, data.design.palette.textPrimary].map((c, j) => <span key={j} className="size-6 rounded-[7px] ring-1 ring-[var(--color-border-subtle)]" style={{ background: c }} />)}</span>}<span className="text-callout text-[var(--color-text-secondary)]">{data.design.screens} {ru ? "экранов" : "screens"} · {data.design.parts.length} {ru ? "сообщений" : "messages"}</span><CopyBtn text={data.design.parts.join("\n\n———\n\n")} label={ru ? "Скопировать все" : "Copy all"} copiedLabel={ru ? "Скопировано" : "Copied"} /></div> },
              { i: 6, t: ru ? "Код" : "Code", body: <div className="flex items-center gap-3"><span className="text-callout text-[var(--color-text-secondary)]">{ru ? "Стартовый бриф для Cursor или Claude Code" : "Starter brief for Cursor or Claude Code"}</span><CopyBtn text={data.codePrompt} label={ru ? "Скопировать" : "Copy"} copiedLabel={ru ? "Скопировано" : "Copied"} /></div> },
              { i: 7, t: ru ? "Запуск" : "Launch", body: <p className="text-callout text-[var(--color-text-secondary)]">{data.channels.length ? data.channels.map((c) => c.name).join(" · ") : (ru ? "начни с ASO-запросов" : "start from the ASO queries")}</p> },
            ].map((row, k) => {
              const Icon = BUILD_ICONS[row.i];
              return (
                <div key={k} className="card-fade relative" style={{ animationDelay: `${150 + k * 120}ms` }}>
                  <span className="absolute -left-6 top-5 flex size-6 items-center justify-center rounded-full bg-[var(--color-bg-page)] ring-2 ring-[var(--color-border-subtle)]"><Icon size={14} /></span>
                  <div className="card-min ml-2 rounded-[20px] p-5">
                    <div className="text-caption font-semibold text-[var(--color-text-tertiary)]">{row.t}</div>
                    <div className="mt-1.5">{row.body}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="card-fade mt-8 text-center text-callout text-[var(--color-text-secondary)]" style={{ animationDelay: "1.2s" }}>
            {ru ? "Дальше вечер с ChatGPT и Cursor. Возвращайся с приложением." : "Next: an evening with ChatGPT and Cursor. Come back with an app."}
          </p>
        </div>
      )}

      {!showResults && (
        <div className="mt-10 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={next}
            className="btn-shimmer inline-flex items-center gap-2 rounded-full px-8 py-4 text-body font-bold text-white shadow-[0_12px_32px_-12px_color-mix(in_srgb,var(--color-accent-brand)_70%,transparent)] transition-transform hover:scale-[1.02] active:scale-[0.99]"
          >
            {step === LAST_STEP ? (ru ? "Собрать план" : "Assemble the plan") : (ru ? "Дальше" : "Continue")}
            <svg width="17" height="17" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M6 4l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
      )}
    </div>
  );
}
