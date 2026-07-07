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
function accentHex(slug: string, shift = 0): string {
  const h = (hueFromSlug(slug) + shift) % 360;
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
  const accent2 = accentHex(idea.category, 45);

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
      `Дизайн-система (применять на каждом экране без отклонений, запомни её). Уровень: победитель Apple Design Awards, стиль-референсы Linear, Arc, Revolut, Whoop:`,
      `- Тёмная тема. Фон: глубокий графит #0C0C10 с едва заметным зерном. Текст: #F5F5F7, вторичный #8E8E97`,
      `- Акцент: живой градиент от ${accent} к ${accent2}, мягкое свечение вокруг ключевых элементов. Больше никаких цветов`,
      `- Стекло в духе Apple Liquid Glass: полупрозрачные карточки с блюром фона, тонкая светлая обводка 1px, ощущение глубины и слоёв`,
      `- Типографика: SF Pro или Inter, tight tracking. Огромные цифры 48-56pt heavy как главный герой экрана, заголовок 22pt semibold, текст 17pt, подписи 13pt`,
      `- Дата-виз: кольца прогресса с градиентом, спарклайны, крупные метрики. Данные выглядят живыми, а не декоративными`,
      `- Компоновка: бенто-сетка из карточек-суперэллипсов (скругление 24-28), кнопка-пилюля 56 с градиентом и свечением, плавающий таб-бар со стеклом`,
      `- Контент экранов: реалистичные данные пользователя из этой ниши, никакого lorem ipsum, цифры правдоподобные`,
      `- Плотность: много воздуха, одна главная мысль на экран. Вау достигается светом, глубиной и типографикой, не нагромождением`,
      antiFeatures.length ? `- Чего в продукте НЕТ и что нельзя рисовать: ${antiFeatures.join(". ")}` : "",
      `- Не рисуй поддельные отзывы, накрученные рейтинги и агрессивные попапы`,
      ``,
      `Всего будет ${screens.length} экранов, я пришлю их пачками по ${SCREENS_PER_PART}. Каждую пачку рисуй как ОДНО изображение: телефоны iPhone 15 Pro в ряд на глубоком тёмном фоне с мягким градиентным свечением, по одному экрану на телефон. Сейчас ничего не рисуй, ответь «готов» и жди первую пачку.`,
    ].filter(Boolean).join("\n");

    const parts = groups.map((g, gi) => {
      const start = gi * SCREENS_PER_PART + 1;
      return [
        `Пачка ${gi + 1} из ${groups.length}. Одно изображение, ${g.length === 1 ? "один телефон" : `${g.length} телефона в ряд`} на глубоком тёмном фоне с мягким градиентным свечением, наша дизайн-система без отклонений.`,
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
    `Design system (apply on every screen, no deviations, memorize it). Bar: Apple Design Awards winner, style references Linear, Arc, Revolut, Whoop:`,
    `- Dark theme. Background: deep graphite #0C0C10 with the faintest grain. Text #F5F5F7, secondary #8E8E97`,
    `- Accent: a living gradient from ${accent} to ${accent2}, soft glow around key elements. No other colors`,
    `- Apple Liquid Glass feel: translucent cards with background blur, a hairline 1px light stroke, layered depth`,
    `- Typography: SF Pro or Inter, tight tracking. Huge 48-56pt heavy numbers as the hero of the screen, titles 22pt semibold, body 17pt, captions 13pt`,
    `- Data viz: gradient progress rings, sparklines, big metrics. Data looks alive, not decorative`,
    `- Layout: a bento grid of squircle cards (24-28 radius), a 56pt gradient pill button with glow, a floating glass tab bar`,
    `- Screen content: realistic user data from this niche, no lorem ipsum, believable numbers`,
    `- Density: generous air, one main thought per screen. The wow comes from light, depth and typography, not from clutter`,
    antiFeatures.length ? `- What the product does NOT do and must not be drawn: ${antiFeatures.join(". ")}` : "",
    `- Never draw fake reviews, inflated ratings or aggressive popups`,
    ``,
    `There will be ${screens.length} screens total, sent in batches of ${SCREENS_PER_PART}. Render each batch as ONE image: iPhone 15 Pro phones in a row on a deep dark background with a soft gradient glow, one screen per phone. Don't draw anything yet, reply "ready" and wait for the first batch.`,
  ].filter(Boolean).join("\n");

  const parts = groups.map((g, gi) => {
    const start = gi * SCREENS_PER_PART + 1;
    return [
      `Batch ${gi + 1} of ${groups.length}. One image, ${g.length === 1 ? "one phone" : `${g.length} phones in a row`} on a deep dark background with a soft gradient glow, our design system with no deviations.`,
      ...g.map((s, i) => `Screen ${start + i}. ${s}`),
    ].join("\n");
  });

  const finale = `Finale: assemble one overview image with all ${screens.length} screens side by side in a grid to verify the system holds together.`;
  return { parts: [setup, ...parts, finale] };
}
