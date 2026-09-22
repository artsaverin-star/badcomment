import localFont from "next/font/local";

// Onest (SIL OFL 1.1, src/site/fonts/Onest-LICENSE.txt) — the app's display face for
// onboarding, paywall and the landing (Inapp/Resources/Fonts/Onest.ttf, variable wght
// 100–900). Exposed as --ia-font-onest, consumed by --ia-font-display in tokens.css.
//
// Served as a WOFF2 subset (performance review P4; spec 04 §6.4): 62 KB instead of the 193 KB
// TTF. Latin + Latin Extended-A/B, Cyrillic, general punctuation, €, ₽, №, ™, arrows and a few
// math signs; the wght axis and every OpenType feature are kept. Onest has no Japanese, so
// ja falls back to the system font, as in the app. Rebuild (fonttools + brotli):
//   pyftsubset Onest.ttf --flavor=woff2 --layout-features='*' \
//     --unicodes='U+0000-024F,U+0400-04FF,U+2000-206F,U+20AC,U+20BD,U+2116,U+2122,U+2190-2193,U+2212,U+2248,U+2260,U+2264-2265' \
//     --output-file=Onest-var.woff2
//
// Not preloaded here: only landing/paywall/onboarding headlines use it, so other pages never
// fetch it. The metric-matched fallback is our own "ia Onest Fallback" face (tokens.css) —
// next/font's automatic one is local("Arial") only, which Android does not have, so the hero
// reflowed from unadjusted Roboto on swap.
export const onest = localFont({
  src: "./fonts/Onest-var.woff2",
  weight: "100 900",
  style: "normal",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  variable: "--ia-font-onest",
  // Only the metric-matched stand-in: --ia-font-display appends var(--ia-font-sans), whose tail
  // carries the Japanese faces (a generic "sans-serif" here would end the stack before them).
  fallback: ["ia Onest Fallback"],
});
