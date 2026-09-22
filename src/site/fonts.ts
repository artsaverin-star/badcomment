import localFont from "next/font/local";

// Onest (SIL OFL 1.1, src/site/fonts/Onest-LICENSE.txt) — the app's display face for
// onboarding, paywall and the landing (Inapp/Resources/Fonts/Onest.ttf, variable wght
// 100–900). Exposed as --ia-font-onest, consumed by --ia-font-display in tokens.css.
// Not preloaded: only landing/paywall headlines use it, so other pages never fetch it.
export const onest = localFont({
  src: "./fonts/Onest.ttf",
  weight: "100 900",
  style: "normal",
  display: "swap",
  preload: false,
  variable: "--ia-font-onest",
  fallback: [
    "-apple-system",
    "BlinkMacSystemFont",
    "Segoe UI",
    "Roboto",
    "Helvetica Neue",
    "Arial",
    "sans-serif",
  ],
});
