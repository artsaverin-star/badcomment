"use client";

import { useState } from "react";
import type { Locale } from "@/lib/i18n";

// Admin prototype of the «Создай свой апп» builder path: six gamified steps
// that turn a catalog idea into launch artifacts. Everything is pre-assembled
// server-side from existing data — the wizard is pure presentation.
// Duolingo-flavored: big friendly cards, a fat progress bar, step check-offs.

export type BuildData = {
  ideaSlug: string;
  ideaTitle: string;
  oneLiner: string;
  nicheName: string;
  gap?: string;
  pains: { quote: string; app: string }[];
  audience: { targetSegment?: string; whyPay?: string; pricePoint?: string; founderWhy?: string };
  aso: { terms: string[]; competitors: { title: string; ratings: number }[]; namingHint: string };
  design: { hasSpec: boolean; theme?: string; palette?: { bg: string; surface: string; accent: string; textPrimary: string }; motif?: string; screens: number; parts: string[] };
  codePrompt: string;
  channels: { name: string; note: string; count: number }[];
};

const STEPS_RU = ["Боль", "Кто платит", "Имя и ASO", "Дизайн", "Код", "Запуск"];
const STEPS_EN = ["Pain", "Who pays", "Name & ASO", "Design", "Code", "Launch"];
const EMOJI = ["🔥", "💸", "🔎", "🎨", "🧑‍💻", "🚀"];

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
  const STEPS = ru ? STEPS_RU : STEPS_EN;
  const [step, setStep] = useState(0);
  const [done, setDone] = useState<boolean[]>(Array(STEPS.length).fill(false));
  const [shot, setShot] = useState<string | null>(null);
  const finished = done.every(Boolean);

  const next = () => {
    setDone((d) => { const nd = [...d]; nd[step] = true; return nd; });
    if (step < STEPS.length - 1) setStep(step + 1);
  };
  const progress = Math.round((done.filter(Boolean).length / STEPS.length) * 100);

  return (
    <div className="mx-auto w-full max-w-[720px]">
      {/* Progress — the fat happy bar. */}
      <div className="sticky top-16 z-20 -mx-1 rounded-[18px] bg-[color-mix(in_srgb,var(--color-bg-page)_88%,transparent)] px-1 py-3 backdrop-blur-xl sm:top-20">
        <div className="flex items-center gap-3">
          <div className="h-3.5 flex-1 overflow-hidden rounded-full bg-[var(--color-bg-muted)]">
            <div className="h-full rounded-full bg-[var(--color-accent-brand)] transition-all duration-500" style={{ width: `${Math.max(progress, 6)}%` }} />
          </div>
          <span className="text-footnote font-bold tabular-nums text-[var(--color-text-secondary)]">{progress}%</span>
        </div>
        <div className="mt-2.5 flex justify-between">
          {STEPS.map((s, i) => (
            <button key={i} type="button" onClick={() => setStep(i)} className="flex flex-col items-center gap-1" aria-current={i === step ? "step" : undefined}>
              <span className={`flex size-8 items-center justify-center rounded-full text-[15px] transition-all ${i === step ? "scale-110 bg-[var(--color-text-primary)]" : done[i] ? "bg-[#30d158]/15" : "bg-[var(--color-bg-muted)]"}`}>
                {done[i] && i !== step ? "✓" : EMOJI[i]}
              </span>
              <span className={`hidden text-caption sm:block ${i === step ? "font-bold text-[var(--color-text-primary)]" : "text-[var(--color-text-tertiary)]"}`}>{s}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Step body */}
      <div className="mt-8">
        {step === 0 && (
          <section>
            <h2 className="text-title2 text-[var(--color-text-primary)]">{ru ? "Вот что болит у людей прямо сейчас" : "This is what hurts people right now"}</h2>
            <p className="mt-3 max-w-[56ch] text-callout text-[var(--color-text-secondary)]">{ru ? "Живые цитаты из отзывов ниши. Твоё приложение существует, чтобы закрыть эту боль." : "Real quotes from the niche's reviews. Your app exists to close this pain."}</p>
            <div className="relative mt-8 flex min-h-[300px] flex-col gap-3">
              {data.pains.slice(0, 6).map((p, i) => (
                <figure
                  key={i}
                  className={`ld-float max-w-[85%] rounded-[20px] rounded-bl-[6px] bg-[var(--color-bg-muted)] px-4 py-3 ${i % 2 ? "self-end rounded-bl-[20px] rounded-br-[6px]" : "self-start"}`}
                  style={{ ["--d" as string]: `${5 + (i % 4) * 0.9}s`, ["--r" as string]: `${i % 2 ? 1.2 : -1.2}deg`, animationDelay: `${i * 0.3}s` }}
                >
                  <p className="text-callout italic text-[var(--color-text-secondary)]">{p.quote}</p>
                  <figcaption className="mt-1 text-caption not-italic text-[var(--color-text-tertiary)]">{p.app}</figcaption>
                </figure>
              ))}
            </div>
            {data.gap && (
              <div className="mt-6 rounded-[22px] bg-[var(--color-text-primary)] p-6">
                <div className="text-caption text-[color-mix(in_srgb,var(--color-bg-page)_65%,transparent)]">{ru ? "Дыра, которую закрываем" : "The gap we close"}</div>
                <p className="mt-2 text-body text-[var(--color-bg-page)]">{data.gap}</p>
              </div>
            )}
          </section>
        )}

        {step === 1 && (
          <section>
            <h2 className="text-title2 text-[var(--color-text-primary)]">{ru ? "Кто заплатит и почему" : "Who pays and why"}</h2>
            <div className="mt-7 flex flex-col gap-3">
              {data.audience.targetSegment && (
                <div className="card-min rounded-[22px] p-6"><div className="text-caption text-[var(--color-text-tertiary)]">{ru ? "Твой платящий" : "Your payer"}</div><p className="mt-2 text-body text-[var(--color-text-primary)]">{data.audience.targetSegment}</p></div>
              )}
              {data.audience.whyPay && (
                <div className="card-min rounded-[22px] p-6"><div className="text-caption text-[var(--color-text-tertiary)]">{ru ? "Почему уже платит" : "Why they already pay"}</div><p className="mt-2 text-callout text-[var(--color-text-secondary)]">{data.audience.whyPay}</p></div>
              )}
              <div className="flex gap-3">
                {data.audience.pricePoint && (
                  <div className="card-min flex-1 rounded-[22px] p-6"><div className="text-caption text-[var(--color-text-tertiary)]">{ru ? "Ценник" : "Price point"}</div><p className="mt-2 text-title3 tabular-nums text-[var(--color-text-primary)]">{data.audience.pricePoint}</p></div>
                )}
              </div>
              {data.audience.founderWhy && (
                <div className="card-min rounded-[22px] p-6"><div className="text-caption text-[var(--color-text-tertiary)]">{ru ? "Решающий фактор" : "Decisive factor"}</div><p className="mt-2 text-callout text-[var(--color-text-secondary)]">{data.audience.founderWhy}</p></div>
              )}
            </div>
          </section>
        )}

        {step === 2 && (
          <section>
            <h2 className="text-title2 text-[var(--color-text-primary)]">{ru ? "Как тебя найдут в сторе" : "How they will find you"}</h2>
            <p className="mt-3 max-w-[56ch] text-callout text-[var(--color-text-secondary)]">{ru ? "Запросы, по которым люди реально ищут в этой нише. Дифференциатор должен быть виден прямо в названии." : "Queries people really search in this niche. The differentiator must be visible in the name itself."}</p>
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
                <div className="text-caption text-[var(--color-text-tertiary)]">{ru ? "Не зови себя как они (топ ниши уже занят)" : "Do not name yourself like these (the top is taken)"}</div>
                <div className="mt-3 flex flex-col gap-2">
                  {data.aso.competitors.map((c, i) => (
                    <div key={i} className="flex items-baseline justify-between gap-3 text-callout"><span className="text-[var(--color-text-primary)]">{c.title}</span><span className="tabular-nums text-caption text-[var(--color-text-tertiary)]">{c.ratings.toLocaleString(ru ? "ru-RU" : "en-US")} {ru ? "оценок" : "ratings"}</span></div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {step === 3 && (
          <section>
            <h2 className="text-title2 text-[var(--color-text-primary)]">{ru ? "Нарисуй все экраны за вечер" : "Render every screen in one evening"}</h2>
            <p className="mt-3 max-w-[56ch] text-callout text-[var(--color-text-secondary)]">{ru ? "Студийная дизайн-спека уже готова. Вставляй сообщения в ChatGPT по порядку, он отрисует все экраны в единой системе." : "The studio design spec is ready. Paste the messages into ChatGPT in order and it renders every screen in one system."}</p>
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
            {/* Own screenshot as a style reference — stays on-device. */}
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

        {step === 4 && (
          <section>
            <h2 className="text-title2 text-[var(--color-text-primary)]">{ru ? "Теперь пусть код напишет агент" : "Now let the agent write the code"}</h2>
            <p className="mt-3 max-w-[56ch] text-callout text-[var(--color-text-secondary)]">{ru ? "Готовый стартовый бриф для Cursor или Claude Code: стек, экраны, модель данных и честный пейвол. Вставь целиком первым сообщением." : "A ready starter brief for Cursor or Claude Code: stack, screens, data model and an honest paywall. Paste it whole as the first message."}</p>
            <div className="mt-7 rounded-[16px] bg-[var(--color-bg-muted)] p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-caption font-semibold text-[var(--color-text-tertiary)]">{ru ? "Бриф для кодового агента" : "The coding-agent brief"}</span>
                <CopyBtn text={data.codePrompt} label={ru ? "Скопировать" : "Copy"} copiedLabel={ru ? "Скопировано" : "Copied"} />
              </div>
              <pre className="mt-2 max-h-[420px] overflow-auto whitespace-pre-wrap text-[12px] leading-[1.5] text-[var(--color-text-secondary)]">{data.codePrompt}</pre>
            </div>
          </section>
        )}

        {step === 5 && (
          <section>
            <h2 className="text-title2 text-[var(--color-text-primary)]">{ru ? "Где брать первых пользователей" : "Where the first users come from"}</h2>
            <p className="mt-3 max-w-[56ch] text-callout text-[var(--color-text-secondary)]">{ru ? "Каналы, которые видны прямо в отзывах ниши: люди сами пишут, как нашли приложение." : "Channels visible right in the niche's reviews: people say themselves how they found the app."}</p>
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
              {!data.channels.length && <p className="text-callout text-[var(--color-text-tertiary)]">{ru ? "Явных каналов в отзывах этой ниши не нашлось, начни с ASO-запросов из шага 3." : "No explicit channels in this niche's reviews, start from the ASO queries in step 3."}</p>}
            </div>
          </section>
        )}
      </div>

      {/* Continue / finish */}
      <div className="mt-10 flex flex-col items-center gap-3">
        {finished && step === STEPS.length - 1 ? (
          <div className="w-full rounded-[24px] bg-[var(--color-text-primary)] p-8 text-center">
            <div className="text-[40px]">🎉</div>
            <div className="mt-2 text-title2 text-[var(--color-bg-page)]">{ru ? "План приложения собран" : "Your app plan is ready"}</div>
            <p className="mx-auto mt-2 max-w-[44ch] text-callout text-[color-mix(in_srgb,var(--color-bg-page)_75%,transparent)]">
              {ru ? "Боль, платящий, имя, дизайн-промпты, код-бриф и каналы. Дальше вечер с ChatGPT и Cursor." : "Pain, payer, name, design prompts, code brief and channels. Next: an evening with ChatGPT and Cursor."}
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={next}
            className="btn-shimmer inline-flex items-center gap-2 rounded-full px-8 py-4 text-body font-bold text-white shadow-[0_12px_32px_-12px_color-mix(in_srgb,var(--color-accent-brand)_70%,transparent)] transition-transform hover:scale-[1.02] active:scale-[0.99]"
          >
            {step === STEPS.length - 1 ? (ru ? "Готово" : "Done") : (ru ? "Дальше" : "Continue")}
            <svg width="17" height="17" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M6 4l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        )}
      </div>
    </div>
  );
}
