import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";
import { getCatalogData } from "@/lib/catalogData";
import { RATING_BY_SLUG } from "@/data/peoplesRating";

// Locale + niche-aware social/OG card.
//   /api/og?l=ru            → the brand card (Russian)
//   /api/og?l=ru&slug=X     → a niche rating card (name, apps, reviews, gamed count)
//   /api/og?logo=1          → a square brand logo (used as Organization.logo)
// Cyrillic needs a real font (Satori ships none), so we load Inter latin+cyrillic
// subsets from public/og-fonts. Cached a day. Avoid em-dash / middle-dot glyphs —
// the subset files don't carry them and Satori would render tofu; use "/" and ",".

const fontFile = (name: string) => readFileSync(join(process.cwd(), "public/og-fonts", name));
const FONTS = [
  { name: "Inter", data: fontFile("inter-latin-800-normal.woff"), weight: 800 as const, style: "normal" as const },
  { name: "Inter", data: fontFile("inter-cyrillic-800-normal.woff"), weight: 800 as const, style: "normal" as const },
  { name: "Inter", data: fontFile("inter-latin-500-normal.woff"), weight: 500 as const, style: "normal" as const },
  { name: "Inter", data: fontFile("inter-cyrillic-500-normal.woff"), weight: 500 as const, style: "normal" as const },
];

const STAR = "M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z";
const GRAD = "linear-gradient(135deg,#FFA62B 0%,#FF5C8A 35%,#B14DEA 66%,#4CB8F5 100%)";

type RSet = { name: string; nameEn: string; count: number; totalReviews: number; inflated: number; apps: { title: string; realScore: number }[] };
const RATING = RATING_BY_SLUG as Record<string, RSet>;
const num = (n: number, en: boolean) => n.toLocaleString(en ? "en-US" : "ru-RU").replace(/[\u00a0\u202f]/g, " ");
const appsWord = (n: number, en: boolean) => {
  if (en) return n === 1 ? "app" : "apps";
  const dd = n % 100, d = n % 10;
  if (dd >= 11 && dd <= 14) return "приложений";
  if (d === 1) return "приложение";
  if (d >= 2 && d <= 4) return "приложения";
  return "приложений";
};

const Mark = ({ size = 78 }: { size?: number }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: size, height: size, borderRadius: Math.round(size * 0.24), backgroundImage: GRAD }}>
    <svg width={Math.round(size * 0.6)} height={Math.round(size * 0.6)} viewBox="0 0 24 24" fill="#fff"><path d={STAR} /></svg>
  </div>
);

const IMG = { width: 1200, height: 630, fonts: FONTS, headers: { "cache-control": "public, max-age=86400, immutable" } } as const;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const en = url.searchParams.get("l") === "en";
  const slug = url.searchParams.get("slug");

  // --- square brand logo (for schema.org Organization.logo) -----------------
  if (url.searchParams.has("logo")) {
    return new ImageResponse(
      (
        <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 40, background: "#fff" }}>
          <Mark size={230} />
          <div style={{ color: "#0a0a0b", fontSize: 92, fontWeight: 800, letterSpacing: -4 }}>inApp</div>
        </div>
      ),
      { width: 512, height: 512, fonts: FONTS, headers: IMG.headers },
    );
  }

  // --- per-niche rating card -------------------------------------------------
  const set = slug ? RATING[slug] : null;
  if (set) {
    const name = en ? set.nameEn : set.name;
    const top = [...set.apps].sort((a, b) => (b.realScore || 0) - (a.realScore || 0))[0];
    const eyebrow = en ? "People's app rating" : "Народный рейтинг приложений";
    const statLine = `${num(set.count, en)} ${appsWord(set.count, en)}, ${num(set.totalReviews, en)} ${en ? "reviews" : "отзывов"}`;
    const inflated = set.inflated > 0
      ? (en ? `${set.inflated} with a gamed star` : `${num(set.inflated, en)} с накрученной звездой`)
      : null;
    const foot = top ? (en ? `Leader: ${top.title}  /  ${top.realScore}/100` : `Лидер: ${top.title}  /  ${top.realScore} из 100`) : "inapp.pro";
    return new ImageResponse(
      (
        <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#0a0a0b", padding: "68px 80px", fontFamily: "Inter" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
            <Mark />
            <div style={{ color: "#fff", fontSize: 56, fontWeight: 800, letterSpacing: -2.5 }}>inApp</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ color: "#a8a8ad", fontSize: 30, fontWeight: 500 }}>{eyebrow}</div>
            <div style={{ color: "#fff", fontSize: 96, fontWeight: 800, lineHeight: 1.0, letterSpacing: -3, maxWidth: 1040 }}>{name}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 8 }}>
              <div style={{ color: "#e6e6e8", fontSize: 36, fontWeight: 500 }}>{statLine}</div>
            </div>
            {inflated ? (
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 14, height: 14, borderRadius: 999, background: "#FF5C8A" }} />
                <div style={{ color: "#FF9BB8", fontSize: 32, fontWeight: 500 }}>{inflated}</div>
              </div>
            ) : null}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
            <div style={{ width: 130, height: 7, borderRadius: 999, backgroundImage: GRAD }} />
            <div style={{ color: "#e6e6e8", fontSize: 28, fontWeight: 500 }}>{foot}</div>
          </div>
        </div>
      ),
      IMG,
    );
  }

  // --- default brand card ----------------------------------------------------
  const { totalReviews } = getCatalogData(en ? "en" : "ru", false);
  const nicheCount = Object.keys(RATING).length;
  const headline = en ? `We analyzed ${num(totalReviews, en)} app reviews` : `Проанализировали ${num(totalReviews, en)} отзывов на приложения`;
  const sub = en
    ? "Broken down by niche, with clear conclusions and concrete ideas. Which apps people actually need."
    : "Разложили по нишам, выводам и сразу конкретным идеям. Какие приложения людям реально нужны.";
  const foot = en ? `inapp.pro  /  ${nicheCount} niches` : `inapp.pro  /  ${nicheCount} ниш`;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#0a0a0b", padding: "68px 80px", fontFamily: "Inter" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <Mark />
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
    IMG,
  );
}
