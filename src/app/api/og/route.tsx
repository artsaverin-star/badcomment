import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";
import { getCatalogData } from "@/lib/catalogData";
import { RATING_BY_SLUG } from "@/data/peoplesRating";

// Locale + niche-aware social/OG card, Mobbin-style: white canvas, big black
// type, real app icons floating as rounded tiles.
//   /api/og?l=ru            → the brand card (Russian)
//   /api/og?l=ru&slug=X     → a niche rating card (name, stats, icon wall)
//   /api/og?logo=1          → a square brand logo (used as Organization.logo)
// Cyrillic needs a real font (Satori ships none), so we load Inter latin+cyrillic
// subsets from public/og-fonts. Cached a day. Avoid em-dash / middle-dot glyphs —
// the subset files don't carry them and Satori would render tofu; use "/" and ",".
// Satori gotchas: every multi-child div needs display:flex; arrays, not fragments.

const fontFile = (name: string) => readFileSync(join(process.cwd(), "public/og-fonts", name));
const FONTS = [
  { name: "Inter", data: fontFile("inter-latin-800-normal.woff"), weight: 800 as const, style: "normal" as const },
  { name: "Inter", data: fontFile("inter-cyrillic-800-normal.woff"), weight: 800 as const, style: "normal" as const },
  { name: "Inter", data: fontFile("inter-latin-500-normal.woff"), weight: 500 as const, style: "normal" as const },
  { name: "Inter", data: fontFile("inter-cyrillic-500-normal.woff"), weight: 500 as const, style: "normal" as const },
];

const STAR = "M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z";
const GRAD = "linear-gradient(135deg,#FFA62B 0%,#FF5C8A 35%,#B14DEA 66%,#4CB8F5 100%)";
const INK = "#0a0a0b";
const GREY = "#8a8a90";

type RApp = { title: string; realScore: number; ratings?: number; icon?: string | null };
type RSet = { name: string; nameEn: string; count: number; totalReviews: number; inflated: number; apps: RApp[] };
const RATING = RATING_BY_SLUG as Record<string, RSet>;
const num = (n: number, en: boolean) => n.toLocaleString(en ? "en-US" : "ru-RU").replace(/[  ]/g, " ");
const appsWord = (n: number, en: boolean) => {
  if (en) return n === 1 ? "app" : "apps";
  const dd = n % 100, d = n % 10;
  if (dd >= 11 && dd <= 14) return "приложений";
  if (d === 1) return "приложение";
  if (d >= 2 && d <= 4) return "приложения";
  return "приложений";
};

const Mark = ({ size = 64 }: { size?: number }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: size, height: size, borderRadius: Math.round(size * 0.24), backgroundImage: GRAD }}>
    <svg width={Math.round(size * 0.6)} height={Math.round(size * 0.6)} viewBox="0 0 24 24" fill="#fff"><path d={STAR} /></svg>
  </div>
);

// A rounded app-icon tile with the soft ring Mobbin tiles have.
const Tile = ({ src, size }: { src: string; size: number }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src={src} width={size} height={size} style={{ borderRadius: Math.round(size * 0.24), boxShadow: "0 10px 28px rgba(10,10,11,0.14)" }} />
);

const topIcons = (apps: RApp[], n: number) =>
  [...apps].sort((a, b) => (b.ratings || 0) - (a.ratings || 0)).map((a) => a.icon).filter((x): x is string => !!x).slice(0, n);

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
          <div style={{ color: INK, fontSize: 92, fontWeight: 800, letterSpacing: -4 }}>inApp</div>
        </div>
      ),
      { width: 512, height: 512, fonts: FONTS, headers: IMG.headers },
    );
  }

  // --- per-niche rating card: text left, staggered icon wall right ----------
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
    const icons = topIcons(set.apps, 8);
    const colA = icons.filter((_, i) => i % 2 === 0);
    const colB = icons.filter((_, i) => i % 2 === 1);
    return new ImageResponse(
      (
        <div style={{ width: "100%", height: "100%", display: "flex", background: "#fff", padding: "60px 0 60px 76px", fontFamily: "Inter" }}>
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1, paddingRight: 40 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <Mark size={58} />
              <div style={{ color: INK, fontSize: 46, fontWeight: 800, letterSpacing: -2 }}>inApp</div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div style={{ color: GREY, fontSize: 28, fontWeight: 500 }}>{eyebrow}</div>
              <div style={{ color: INK, fontSize: 88, fontWeight: 800, lineHeight: 1.02, letterSpacing: -3.5, maxWidth: 720 }}>{name}</div>
              <div style={{ display: "flex", color: "#3c3c42", fontSize: 33, fontWeight: 500, marginTop: 6 }}>{statLine}</div>
              {inflated ? (
                <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
                  <div style={{ width: 13, height: 13, borderRadius: 999, background: "#FF5C8A" }} />
                  <div style={{ color: "#d4477e", fontSize: 30, fontWeight: 500 }}>{inflated}</div>
                </div>
              ) : null}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <div style={{ width: 110, height: 6, borderRadius: 999, backgroundImage: GRAD }} />
              <div style={{ color: GREY, fontSize: 26, fontWeight: 500, maxWidth: 560 }}>{foot}</div>
            </div>
          </div>

          {icons.length >= 4 ? (
            <div style={{ display: "flex", gap: 22, width: 330, paddingRight: 8 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 22, marginTop: -34 }}>
                {colA.map((src, i) => <Tile key={i} src={src} size={132} />)}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 22, marginTop: 62 }}>
                {colB.map((src, i) => <Tile key={i} src={src} size={132} />)}
              </div>
            </div>
          ) : null}
        </div>
      ),
      IMG,
    );
  }

  // --- default brand card: centered type, icon row peeking from the bottom --
  const { totalReviews } = getCatalogData(en ? "en" : "ru", false);
  const nicheCount = Object.keys(RATING).length;
  const headline = en ? `We analyzed ${num(totalReviews, en)} app reviews` : `Проанализировали ${num(totalReviews, en)} отзывов на приложения`;
  const sub = en
    ? `Honest ratings, niche breakdowns and ideas people pay for. ${nicheCount} niches on inapp.pro`
    : `Честные рейтинги, разборы ниш и идеи, за которые платят. ${nicheCount} ниш на inapp.pro`;
  // One icon from each of the biggest niches, for the floating bottom row.
  const brandIcons = Object.values(RATING)
    .map((r) => ({ mass: r.totalReviews, icon: topIcons(r.apps, 1)[0] }))
    .filter((x): x is { mass: number; icon: string } => !!x.icon)
    .sort((a, b) => b.mass - a.mass)
    .slice(0, 7)
    .map((x) => x.icon);
  const lift = [36, -6, 24, -18, 30, 0, 42];

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", background: "#fff", padding: "64px 80px 0", fontFamily: "Inter" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Mark size={54} />
          <div style={{ color: INK, fontSize: 42, fontWeight: 800, letterSpacing: -1.8 }}>inApp</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22, marginTop: 52 }}>
          <div style={{ color: INK, fontSize: en ? 72 : 64, fontWeight: 800, lineHeight: 1.04, letterSpacing: -2.6, maxWidth: 980, textAlign: "center" }}>{headline}</div>
          <div style={{ color: GREY, fontSize: 30, fontWeight: 500, lineHeight: 1.35, maxWidth: 860, textAlign: "center" }}>{sub}</div>
        </div>

        {brandIcons.length >= 5 ? (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 30, marginTop: "auto" }}>
            {brandIcons.map((src, i) => (
              <div key={i} style={{ display: "flex", transform: `translateY(${18 - (lift[i] ?? 0)}px)` }}>
                <Tile src={src} size={116} />
              </div>
            ))}
          </div>
        ) : null}
      </div>
    ),
    IMG,
  );
}
