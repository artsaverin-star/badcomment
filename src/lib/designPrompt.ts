import { getIdea } from "@/lib/ideas";
import { ideaContentEn } from "@/lib/regenCards";
import { scoreFor } from "@/lib/ideaScores";
import { hueFromSlug } from "@/lib/categoryGradient";
import designSpecs from "@/data/designSpecs.json";

// A studio-authored design spec (pre-generated per idea, see
// gen/design-specs/). When present it replaces the model's design-first step:
// the buyer gets our locked direction instantly and goes straight to render.
type DesignSpec = {
  slug: string;
  territory: string;
  theme: "light" | "dark";
  palette: { bg: string; surface: string; textPrimary: string; textSecondary: string; accent: string; note?: string };
  typography: string;
  motif: string;
  ia: { coreObject: string; primaryLoop: string; tabs: string[] };
  screens: { title: string; purpose: string; hero: string; data: string }[];
};
const SPECS = designSpecs as Record<string, DesignSpec>;

// The paid design brief of an idea: a sequence of paste-into-ChatGPT messages
// that first makes the model DESIGN (emotional territory, art direction,
// information architecture — as text, no images), and only after the buyer's
// "go" renders every screen in batches of three, one image per batch.
//
// Why this shape: a single baked-in style made every app look like the same
// dark-neon template and misfit half the catalog (a family inheritance vault
// is not a workout tracker). The style must be derived per idea; the niche
// only seeds the emotional territory. Assembled server-side, strictly paid,
// never in the page payload. Always fully English — image models follow
// English best, EN overlays cover the whole catalog.

const SCREENS_PER_PART = 3;

// Starting emotional territory per niche. A seed, not a cage — the setup
// message tells the model to refine it for the concrete idea.
const NICHE_TONE: Record<string, string> = {
  "password-manager": "trust and calm control, bank-vault dignity, legacy-grade solidity. Precise quiet type, deep ink or warm paper tones. Never neon, never playful",
  "sobriety": "quiet strength and dignity, one day at a time. Dawn light, warm neutrals, gentle serif moments",
  "baby-tracking": "tenderness and 3am reassurance. Soft warm hues, rounded shapes, a night-friendly dark mode that whispers",
  "pregnancy-tracker": "anticipation and care. Warm, soft, unhurried, nothing clinical or alarming",
  "period-cycle": "body literacy and privacy. Soft but adult, never infantilizing pink cliches",
  "blood-pressure-log": "clinical calm for older eyes. High contrast, big legible type, medical clarity. No gamification",
  "weight-tracker": "steady honest progress. Clean, encouraging, numbers without judgement",
  "nutrition-calories": "energy and honest numbers. Appetizing, fresh, clear data",
  "intermittent-fasting": "calm discipline and bodily awareness. Clean timers, gentle phases, no aggression",
  "workout-fitness": "energy and momentum. Bold type, motion, heat is welcome here",
  "run-tracking": "forward motion and open air. Speed, maps, split-second legibility",
  "step-counter": "light daily momentum. Simple, glanceable, friendly",
  "meditation-mindfulness": "stillness and breath. Dusk gradients, enormous emptiness, almost no UI",
  "sleep-tracking": "the depth of night. Dark, soft, luminous data like moonlight",
  "journaling-mood": "private warmth, the feeling of paper. Cream, ink, a serif voice",
  "habit-tracking": "small wins compounding. Crisp, rhythmic, satisfying checkmarks",
  "focus-productivity": "clarity and flow. A calm workspace, generous whitespace, one thing at a time",
  "calendars-tasks": "orderly confidence. Structured grids, daylight, zero clutter",
  "notes-pkm": "a craftsman's studio for thought. Paper-like, typographic, tool-like restraint",
  "mind-mapping": "spatial thinking. Airy canvas, node energy, playful precision",
  "flashcards": "focused learning reps. Card physicality, satisfying flips, exam-day confidence",
  "astrology": "mystic night sky. Celestial ornament, gold on deep blue-black, wonder",
  "dating-apps": "chemistry and warmth. Human faces first, inviting light, heartbeat accents",
  "ai-avatars-headshots": "a visual playground. Content-first, the UI recedes behind imagery",
  "ai-image-generation": "a creative engine room. Dark stage where generated images glow",
  "photo-editing": "a precision darkroom. Neutral chrome around the photo, pro-tool calm",
  "wallpapers-widgets": "visual candy done tastefully. The content IS the design",
  "language-learning": "bright encouragement and playful rigor. Friendly color, clear reps",
  "personal-finance": "quiet competence with money. Confident neutrals, precise numbers, daylight",
  "stock-investing": "professional precision. Terminal clarity without terminal coldness",
  "crypto-investing": "sharp data confidence. Dark is fine, hype is not",
  "invoice-maker": "professional daylight. Paper-document clarity, business calm",
  "resume-builder": "career confidence. Editorial typography, document craft",
  "music-streaming": "an immersive stage. Content-forward, dark theater, album art glows",
  "video-streaming": "cinema in the pocket. Dark theater, posters first",
  "food-delivery": "appetite and speed. Daylight, appetizing photography, zero friction",
  "recipes-meal-planning": "fresh ingredients and kitchen daylight. Warm, appetizing, practical",
  "meal-prep-grocery": "an organized kitchen week. Fresh, practical, list-driven calm",
  "messaging-apps": "lightness and presence. Airy, fast, human",
  "shopping-ecommerce": "editorial retail. Product photography, white space, desire",
  "wardrobe-outfit": "personal style editorial. Fashion-magazine air, fabric textures",
  "ride-hailing": "map-first wayfinding. Motion, ETA clarity, street energy",
  "travel-planning": "wanderlust with a plan. Maps, light, the joy of the trip ahead",
  "weather-apps": "the sky itself as the canvas. Atmospheric light, conditions set the mood",
  "plant-care": "botanical calm. Chlorophyll greens, paper field-guide notes, patience",
  "pet-care": "companionship warmth. Soft, friendly, practical",
  "ai-writing": "a focused writing studio. Text-first, typographic, quiet assistance",
  "ai-chatbot": "a capable counterpart. Conversational clarity, focused, trustworthy",
  "scanner-pdf": "utility speed. One-thumb clarity, zero decoration, instant result",
  "qr-scanner": "instant honest utility. Camera-first, one action, total transparency",
  "voice-recorder": "capture without fuss. Waveforms as the hero, recording-studio focus",
  "translator": "bridge between languages. Two-voice clarity, travel-ready legibility",
  "driving-test-prep": "exam confidence. Road-signage clarity, calm drill rhythm",
  "car-maintenance": "garage competence. Mechanical precision, workshop practicality",
  "water-hydration": "freshness and liquid light. Airy, clear, glass-of-water simplicity",
};

// A starting accent from the niche hue — offered as a hint the model may
// keep or replace if its chosen territory demands another.
function accentHex(slug: string): string {
  const h = hueFromSlug(slug) % 360;
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

export function buildDesignPrompt(slug: string): { parts: string[] } | null {
  const idea = getIdea(slug);
  if (!idea) return null;
  const authored = SPECS[slug];
  if (authored) return buildFromSpec(authored);
  const en = ideaContentEn(slug, "en");

  const title = en?.title ?? idea.title;
  const oneLiner = en?.oneLiner ?? idea.oneLiner;
  const gap = en?.gap ?? idea.gap;
  const pitch = en?.pitch ?? idea.idea?.pitch;
  const features: string[] = en?.features ?? idea.idea?.features ?? [];
  const antiFeatures: string[] = en?.antiFeatures ?? idea.idea?.antiFeatures ?? [];
  const monetization = en?.monetization ?? idea.idea?.monetization;
  const score = scoreFor(slug, "en");
  const tone = NICHE_TONE[idea.category] ?? "derive it yourself from the product's job and the moment of use";
  const accent = accentHex(idea.category);

  // Provisional screen plan: content requirements, not visual style. The model
  // is asked to improve this plan in its design spec before rendering.
  const screens: string[] = [
    `Onboarding, two steps max: the promise "${oneLiner}" and only the truly needed permissions`,
    `The main screen: the product's central object on an ordinary day, mid-use, with believable data`,
    ...features.map((f) => `A screen for the mechanic "${f}": the exact state where this mechanic earns its keep, real data, real labels`),
    `The paywall: ${monetization ?? "a one-time purchase instead of a subscription"}. Price visible, what opens listed, restore-purchase present. Its tone must match the product's territory`,
    `The first-launch empty state: what a brand-new user sees and the one obvious next step`,
    `Settings and profile: only the controls this product genuinely needs`,
  ];
  const groups = chunk(screens, SCREENS_PER_PART);

  const setup = [
    `You are the design director of a small studio known for interfaces with a strong point of view. We are designing the iOS app "${title}" end to end, then rendering every screen.`,
    ``,
    `THE PRODUCT`,
    `What it is: ${oneLiner}${pitch ? ` ${pitch}` : ""}`,
    score?.targetSegment ? `Who it is for: ${score.targetSegment}.${score.whyPay ? ` Why they pay: ${score.whyPay}` : ""}` : "",
    gap ? `The niche gap it closes: ${gap}` : "",
    antiFeatures.length ? `What it deliberately does NOT do: ${antiFeatures.join(". ")}` : "",
    ``,
    `STEP 1 — DESIGN FIRST, NO IMAGES YET. Reply with a compact design spec:`,
    `1. Emotional territory. Starting hint from the market: ${tone}. Refine it for THIS product: name the feeling the person is in at the moment of use, and the feeling the interface must answer with.`,
    `2. Art direction serving that territory: background and surface colors (exact hexes), one accent (starting suggestion ${accent}, replace it freely if the territory demands), light or dark theme as the territory dictates, typography with personality (name real typefaces), shapes, and one ownable visual motif that could only belong to this product.`,
    `3. Information architecture: the core object of the product, the primary loop (what the user does daily and what brings them back), a tab bar of 3-4 real destinations.`,
    `4. Screen plan: take my provisional list below and improve it. Merge, reorder, add the states my list misses. Keep it honest to the product.`,
    ``,
    `Hard rules for the whole session:`,
    `- Do NOT default to the generic dark-gradient "AI startup" look. Dark neon is allowed only if this product's territory truly calls for it. Light, paper, editorial and clinical directions are equally welcome.`,
    `- Every number and label on future screens must be believable for this exact audience. No lorem ipsum, no vanity percentages unless the product's mechanic defines them.`,
    `- No fake reviews, no inflated ratings, no dark patterns anywhere, including the paywall.`,
    `- iOS conventions apply: status bar, home indicator, native-feeling layout.`,
    ``,
    `My provisional screen list (${screens.length} screens): ${screens.map((s, i) => `${i + 1}) ${s.split(":")[0]}`).join(". ")}.`,
    ``,
    `Write the design spec now and end with the final screen list. No images yet. I will reply "go" when the direction is right, then we render in batches of ${SCREENS_PER_PART}.`,
  ].filter(Boolean).join("\n");

  const parts = groups.map((g, gi) => {
    const start = gi * SCREENS_PER_PART + 1;
    return [
      `Batch ${gi + 1} of ${groups.length}. ONE image: ${g.length === 1 ? "one iPhone 15 Pro" : `${g.length} iPhone 15 Pro phones side by side`} on a backdrop that belongs to the design spec you locked. Follow your spec exactly, no style drift between batches.`,
      ...g.map((s, i) => `Screen ${start + i}. ${s}`),
      `If your approved screen plan replaced any of these, render your version and say so.`,
    ].join("\n");
  });

  const finale = `Finale: one overview image, all screens in a grid on the spec's backdrop. Check that it reads as ONE product with one point of view, then name the three weakest screens and why.`;
  return { parts: [setup, ...parts, finale] };
}

// Authored path: our studio already did the design thinking. The setup hands
// the model a locked spec, batches walk the spec's own screen plan.
function buildFromSpec(spec: DesignSpec): { parts: string[] } {
  const p = spec.palette;
  const setup = [
    `You are a senior product designer rendering an iOS app from a locked design spec written by our studio. Do not redesign it, execute it with craft.`,
    ``,
    `EMOTIONAL TERRITORY: ${spec.territory}`,
    ``,
    `DESIGN SPEC (follow exactly on every screen):`,
    `- Theme: ${spec.theme}. Background ${p.bg}, surfaces ${p.surface}, primary text ${p.textPrimary}, secondary ${p.textSecondary}, single accent ${p.accent}.${p.note ? ` ${p.note}` : ""}`,
    `- Typography: ${spec.typography}`,
    `- Visual motif: ${spec.motif}`,
    `- Core object: ${spec.ia.coreObject}. Primary loop: ${spec.ia.primaryLoop}`,
    `- Tab bar: ${spec.ia.tabs.join(" · ")}`,
    `- iOS conventions: status bar, home indicator, native-feeling layout`,
    `- Believable data only, no lorem ipsum. No dark patterns, no fake reviews, no inflated ratings`,
    ``,
    `There are ${spec.screens.length} screens, sent in batches of ${SCREENS_PER_PART}. Render each batch as ONE image: iPhone 15 Pro phones side by side on a backdrop that belongs to this spec, one screen per phone. Don't draw anything yet, reply "ready" and wait for the first batch.`,
  ].join("\n");

  const groups = chunk(spec.screens, SCREENS_PER_PART);
  const parts = groups.map((g, gi) => {
    const start = gi * SCREENS_PER_PART + 1;
    return [
      `Batch ${gi + 1} of ${groups.length}. ONE image, ${g.length === 1 ? "one phone" : `${g.length} phones side by side`}, the locked spec with zero drift.`,
      ...g.map((s, i) => `Screen ${start + i} — ${s.title}. Purpose: ${s.purpose} Hero: ${s.hero}. Show: ${s.data}`),
    ].join("\n");
  });

  const finale = `Finale: one overview image, all ${spec.screens.length} screens in a grid on the spec's backdrop. It must read as ONE product with one point of view.`;
  return { parts: [setup, ...parts, finale] };
}
