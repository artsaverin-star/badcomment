import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";

// Locale-aware social/OG card. /api/og?l=ru → Russian, ?l=en → English. Cyrillic
// needs a real font (Satori ships none), so we load Inter latin+cyrillic subsets
// from public/og-fonts. Cached a day. Avoid em-dash / middle-dot glyphs — the
// subset files don't carry them and Satori would render tofu.
// Dynamic (varies by ?l=); the cache-control header below lets clients cache it.

const fontFile = (name: string) => readFileSync(join(process.cwd(), "public/og-fonts", name));
const FONTS = [
  { name: "Inter", data: fontFile("inter-latin-800-normal.woff"), weight: 800 as const, style: "normal" as const },
  { name: "Inter", data: fontFile("inter-cyrillic-800-normal.woff"), weight: 800 as const, style: "normal" as const },
  { name: "Inter", data: fontFile("inter-latin-500-normal.woff"), weight: 500 as const, style: "normal" as const },
  { name: "Inter", data: fontFile("inter-cyrillic-500-normal.woff"), weight: 500 as const, style: "normal" as const },
];

const STAR = "M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z";
const GRAD = "linear-gradient(135deg,#FFA62B 0%,#FF5C8A 35%,#B14DEA 66%,#4CB8F5 100%)";

export async function GET(req: Request) {
  const en = new URL(req.url).searchParams.get("l") === "en";
  const headline = en ? "We analyzed 428,000 app reviews" : "Проанализировали 428 000 отзывов на приложения";
  const sub = en
    ? "Broken down by niche, with clear conclusions and concrete ideas. Which apps people actually need."
    : "Разложили по нишам, выводам и сразу конкретным идеям. Какие приложения людям реально нужны.";
  const foot = en ? "inapp.pro  /  65 niches" : "inapp.pro  /  65 ниш";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0a0a0b",
          padding: "68px 80px",
          fontFamily: "Inter",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 78, height: 78, borderRadius: 19, backgroundImage: GRAD }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="#fff"><path d={STAR} /></svg>
          </div>
          <div style={{ color: "#fff", fontSize: 56, fontWeight: 800, letterSpacing: -2.5 }}>inApp</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ color: "#fff", fontSize: en ? 76 : 66, fontWeight: 800, lineHeight: 1.04, letterSpacing: -2.5, maxWidth: 1040 }}>{headline}</div>
          <div style={{ color: "#a8a8ad", fontSize: 31, fontWeight: 500, lineHeight: 1.35, maxWidth: 1000 }}>{sub}</div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <div style={{ width: 130, height: 7, borderRadius: 999, backgroundImage: GRAD }} />
          <div style={{ color: "#e6e6e8", fontSize: 28, fontWeight: 500 }}>{foot}</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630, fonts: FONTS, headers: { "cache-control": "public, max-age=86400, immutable" } },
  );
}
