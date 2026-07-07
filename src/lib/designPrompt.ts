import { getIdea } from "@/lib/ideas";
import { ideaContentEn } from "@/lib/regenCards";
import { scoreFor } from "@/lib/ideaScores";
import { hueFromSlug } from "@/lib/categoryGradient";
import type { Locale } from "@/lib/i18n";

// The paid design brief of an idea: a sequence of paste-into-ChatGPT messages
// that renders EVERY screen of the app in one coherent design system. Split
// into parts because image models can't hold 20 screens in one picture:
// part 0 is the setup (role + product + design system), every next part asks
// for one image with up to three phone screens side by side.
// Assembled server-side only — it must never reach the client for non-paying
// users, including the free showcase cards.

const SCREENS_PER_PART = 3;

// One accent per niche, derived from the same hue the site's art wash uses,
// so the mockups visually rhyme with the niche's pages.
function accentHex(slug: string): string {
  const h = hueFromSlug(slug);
  const s = 0.62, l = 0.46;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const to = (x: number) => Math.round(255 * x).toString(16).padStart(2, "0");
  return `#${to(f(0))}${to(f(8))}${to(f(4))}`;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export function buildDesignPrompt(slug: string, locale: Locale): { parts: string[] } | null {
  const idea = getIdea(slug);
  if (!idea) return null;
  const ru = locale !== "en";
  const en = !ru ? ideaContentEn(slug, locale) : null;

  const title = en?.title ?? idea.title;
  const oneLiner = en?.oneLiner ?? idea.oneLiner;
  const gap = en?.gap ?? idea.gap;
  const pitch = en?.pitch ?? idea.idea?.pitch;
  const features: string[] = en?.features ?? idea.idea?.features ?? [];
  const antiFeatures: string[] = en?.antiFeatures ?? idea.idea?.antiFeatures ?? [];
  const monetization = en?.monetization ?? idea.idea?.monetization;
  const score = scoreFor(slug, locale);
  const accent = accentHex(idea.category);

  if (ru) {
    const screens: string[] = [
      `Онбординг из двух шагов: обещание «${oneLiner}» и запрос только необходимых разрешений`,
      `Главный экран: центральный объект продукта в состоянии обычного дня пользователя`,
      ...features.map((f) => `Экран под механику «${f}»: покажи это состояние в живом интерфейсе с правдоподобными данными, без заглушек`),
      `Пейвол: ${monetization ?? "разовая покупка вместо подписки"}. Покажи цену, что открывается, кнопку восстановления покупки. Без тёмных паттернов`,
      `Пустое состояние первого запуска с одним понятным следующим шагом`,
      `Настройки и профиль`,
    ];
    const groups = chunk(screens, SCREENS_PER_PART);

    const setup = [
      `Ты сеньор продуктовый дизайнер. Мы отрисуем полный комплект экранов iOS-приложения «${title}», по несколько экранов за сообщение.`,
      ``,
      `Что за продукт: ${oneLiner}${pitch ? ` ${pitch}` : ""}`,
      score?.targetSegment ? `Для кого: ${score.targetSegment}.${score.whyPay ? ` Почему платят: ${score.whyPay}` : ""}` : "",
      gap ? `Дыра в нише, которую закрываем: ${gap}` : "",
      ``,
      `Дизайн-система (применять на каждом экране без отклонений, запомни её):`,
      `- Светлая тема. Палитра: фон #F7F7F5, карточки #FFFFFF, основной текст #141414, вторичный #71717A, единственный акцент ${accent}. Никаких градиентов и неона`,
      `- Типографика: SF Pro или Inter. Крупные числа 34pt bold, заголовок экрана 22pt semibold, обычный текст 17pt, подписи 13pt`,
      `- Компоненты: карточки со скруглением 20, главная кнопка-пилюля высотой 52 на всю ширину, таб-бар с 3-4 вкладками, списки в стиле iOS inset grouped`,
      `- Контент экранов: реалистичные данные пользователя из этой ниши, никакого lorem ipsum, цифры правдоподобные`,
      `- Плотность: много воздуха, одна главная мысль на экран`,
      antiFeatures.length ? `- Чего в продукте НЕТ и что нельзя рисовать: ${antiFeatures.join(". ")}` : "",
      `- Не рисуй поддельные отзывы, накрученные рейтинги и агрессивные попапы`,
      ``,
      `Всего будет ${screens.length} экранов, я пришлю их пачками по ${SCREENS_PER_PART}. Каждую пачку рисуй как ОДНО изображение: телефоны iPhone 15 Pro в ряд на нейтральном светлом фоне, по одному экрану на телефон. Сейчас ничего не рисуй, ответь «готов» и жди первую пачку.`,
    ].filter(Boolean).join("\n");

    const parts = groups.map((g, gi) => {
      const start = gi * SCREENS_PER_PART + 1;
      return [
        `Пачка ${gi + 1} из ${groups.length}. Одно изображение, ${g.length === 1 ? "один телефон" : `${g.length} телефона в ряд`}, наша дизайн-система без отклонений.`,
        ...g.map((s, i) => `Экран ${start + i}. ${s}`),
      ].join("\n");
    });

    const finale = `Финал: собери одно обзорное изображение со всеми ${screens.length} экранами рядом в сетке, чтобы проверить единство системы.`;
    return { parts: [setup, ...parts, finale] };
  }

  const screens: string[] = [
    `A two-step onboarding: the promise "${oneLiner}" and only the truly needed permissions`,
    `The main screen: the product's central object on an ordinary user day`,
    ...features.map((f) => `A screen for the mechanic "${f}": show this state in a living interface with believable data, no placeholders`),
    `The paywall: ${monetization ?? "a one-time purchase instead of a subscription"}. Show the price, what opens, a restore-purchase button. No dark patterns`,
    `The first-launch empty state with one clear next step`,
    `Settings and profile`,
  ];
  const groups = chunk(screens, SCREENS_PER_PART);

  const setup = [
    `You are a senior product designer. We will render the complete screen set of the iOS app "${title}", a few screens per message.`,
    ``,
    `What the product is: ${oneLiner}${pitch ? ` ${pitch}` : ""}`,
    score?.targetSegment ? `Who it is for: ${score.targetSegment}.${score.whyPay ? ` Why they pay: ${score.whyPay}` : ""}` : "",
    gap ? `The niche gap we close: ${gap}` : "",
    ``,
    `Design system (apply on every screen, no deviations, memorize it):`,
    `- Light theme. Palette: background #F7F7F5, cards #FFFFFF, primary text #141414, secondary #71717A, a single accent ${accent}. No gradients, no neon`,
    `- Typography: SF Pro or Inter. Big numbers 34pt bold, screen title 22pt semibold, body 17pt, captions 13pt`,
    `- Components: cards with 20pt radius, a full-width 52pt pill button, a 3-4 tab bar, iOS inset grouped lists`,
    `- Screen content: realistic user data from this niche, no lorem ipsum, believable numbers`,
    `- Density: generous air, one main thought per screen`,
    antiFeatures.length ? `- What the product does NOT do and must not be drawn: ${antiFeatures.join(". ")}` : "",
    `- Never draw fake reviews, inflated ratings or aggressive popups`,
    ``,
    `There will be ${screens.length} screens total, sent in batches of ${SCREENS_PER_PART}. Render each batch as ONE image: iPhone 15 Pro phones in a row on a neutral light background, one screen per phone. Don't draw anything yet, reply "ready" and wait for the first batch.`,
  ].filter(Boolean).join("\n");

  const parts = groups.map((g, gi) => {
    const start = gi * SCREENS_PER_PART + 1;
    return [
      `Batch ${gi + 1} of ${groups.length}. One image, ${g.length === 1 ? "one phone" : `${g.length} phones in a row`}, our design system with no deviations.`,
      ...g.map((s, i) => `Screen ${start + i}. ${s}`),
    ].join("\n");
  });

  const finale = `Finale: assemble one overview image with all ${screens.length} screens side by side in a grid to verify the system holds together.`;
  return { parts: [setup, ...parts, finale] };
}
