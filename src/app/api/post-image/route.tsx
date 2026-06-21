import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";
import { getCategoryBySlug } from "@/lib/researchCategories";
import { getSegmentSummary } from "@/lib/segmentSummary";
import { listIdeas } from "@/lib/ideas";
import { hueFromSlug } from "@/lib/categoryGradient";

// Square (1080×1080) carousel slide for a category, for social posts. ?slug=&i=0..6
//   0      = hook cover (big reviews number + "what to build" promise)
//   1..5   = the five top product ideas to build, ranked by real demand
//   6      = read-in-full / follow CTA
// The ideas are the hook: concrete "build this" propositions backed by demand —
// NOT complaints about price or bugs (those are not insights — see memory). ONE
// idea per slide, big type, little text. Cyrillic via the bundled Inter subsets.
// NO emoji on images (Satori has no emoji source → would 502); keep emoji for the
// caption only. Any <div> with >1 child MUST set display:flex.
const SLIDE_COUNT = 7;

const fontFile = (name: string) => readFileSync(join(process.cwd(), "public/og-fonts", name));
const FONTS = [
  { name: "Inter", data: fontFile("inter-latin-800-normal.woff"), weight: 800 as const, style: "normal" as const },
  { name: "Inter", data: fontFile("inter-cyrillic-800-normal.woff"), weight: 800 as const, style: "normal" as const },
  { name: "Inter", data: fontFile("inter-latin-500-normal.woff"), weight: 500 as const, style: "normal" as const },
  { name: "Inter", data: fontFile("inter-cyrillic-500-normal.woff"), weight: 500 as const, style: "normal" as const },
];
const STAR = "M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z";
const GRAD = "linear-gradient(135deg,#FFA62B 0%,#FF5C8A 35%,#B14DEA 66%,#4CB8F5 100%)";

// Raw per-slug hues land anywhere on the wheel, and the olive/chartreuse band
// (~60-130) reads muddy on a dark card. Snap each hue to the nearest vivid anchor
// (never muddy), then add a tiny deterministic jitter so two close categories keep
// distinct colours. A neutral near-black base carries the hue only in the top bloom.
const ANCHORS = [255, 272, 290, 222, 240, 200, 178, 158, 330, 345, 8, 24, 40, 308];
function niceHue(raw: number): number {
  let best = ANCHORS[0], bd = 999;
  for (const a of ANCHORS) {
    const d = Math.min(Math.abs(a - raw), 360 - Math.abs(a - raw));
    if (d < bd) { bd = d; best = a; }
  }
  return (best + (raw % 17) - 8 + 360) % 360;
}
function bg(hue: number) {
  const h2 = (hue + 34) % 360;
  return {
    backgroundColor: `hsl(${hue} 18% 5%)`,
    backgroundImage: [
      `radial-gradient(74% 60% at 38% -12%, hsl(${hue} 85% 60% / 0.55), transparent 60%)`,
      `radial-gradient(60% 50% at 84% -8%, hsl(${h2} 84% 60% / 0.38), transparent 58%)`,
      `radial-gradient(120% 80% at 50% -26%, hsl(${hue} 50% 24% / 0.20), transparent 72%)`,
    ].join(", "),
  };
}
function plural(n: number, one: string, few: string, many: string): string {
  const a = n % 10, b = n % 100;
  if (a === 1 && b !== 11) return one;
  if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return few;
  return many;
}
// Trim to ~max chars on a word boundary + ellipsis — never a chopped-off word.
function clip(text: string, max: number): string {
  const s = (text || "").trim();
  if (s.length <= max) return s;
  const head = s.slice(0, max);
  const sp = head.lastIndexOf(" ");
  return (sp > 0 ? head.slice(0, sp) : head).replace(/[\s,;:—-]+$/, "") + "…";
}
// Short ideas read as-is (keep their punch); long ones collapse to the lead name
// before the " — " / ": " tagline (the oneLiner carries the description anyway).
function ideaName(title: string): string {
  const t = (title || "").trim();
  if (t.length <= 34) return t;
  return (t.split(/\s—\s|:\s/)[0].trim() || t).slice(0, 42);
}

// The shared chrome: logo header, eyebrow + content block, footer.
function frame(hue: number, accent: string, eyebrow: string, kids: React.ReactNode) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "76px 76px 64px",
        fontFamily: "Inter",
        ...bg(hue),
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 54, height: 54, borderRadius: 14, backgroundImage: GRAD }}>
          <svg width="33" height="33" viewBox="0 0 24 24" fill="#fff"><path d={STAR} /></svg>
        </div>
        <div style={{ color: "#fff", fontSize: 38, fontWeight: 800, letterSpacing: -1.5 }}>inApp</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        {eyebrow ? <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: 5, color: accent }}>{eyebrow}</div> : null}
        <div style={{ marginTop: 24, display: "flex", flexDirection: "column" }}>{kids}</div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ width: 104, height: 6, borderRadius: 999, backgroundImage: GRAD }} />
        <div style={{ color: "#8a8a90", fontSize: 29, fontWeight: 500 }}>inApp.pro</div>
      </div>
    </div>
  );
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug") || "";
  const i = Math.max(0, Math.min(SLIDE_COUNT - 1, Number(url.searchParams.get("i") || 0)));

  const cat = getCategoryBySlug(slug, "ru");
  const summary = getSegmentSummary(slug);
  if (!cat || !summary) return new Response("not found", { status: 404 });

  const hue = niceHue(hueFromSlug(slug));
  const accent = `hsl(${hue} 88% 68%)`;
  const reviews = (summary.reviewsScanned || 5000).toLocaleString("ru-RU");
  const apps = summary.appsCount || 10;

  // The category's ideas, ranked by real demand — the top five become slides.
  const ideas = listIdeas()
    .filter((x) => x.category === slug)
    .sort((a, b) => (b.stats?.observations || 0) - (a.stats?.observations || 0));
  const top = ideas.slice(0, 5);

  let node: React.ReactNode;

  if (i === 0) {
    node = frame(hue, accent, "РАЗБОР НИШИ", [
      <div key="n" style={{ fontSize: 168, fontWeight: 800, letterSpacing: -6, lineHeight: 0.92, color: "#fff" }}>{reviews}</div>,
      <div key="r" style={{ fontSize: 50, fontWeight: 800, letterSpacing: -1.5, color: "#fff" }}>отзывов прочитали</div>,
      <div key="a" style={{ marginTop: 14, fontSize: 37, fontWeight: 500, color: "#c9c9d2" }}>{`${apps} приложений · «${cat.name}»`}</div>,
      <div key="p" style={{ marginTop: 30, fontSize: 39, fontWeight: 800, letterSpacing: -1, color: accent }}>5 идей, что построить — под живой спрос</div>,
    ]);
  } else if (i >= 1 && i <= 5) {
    const idea = top[i - 1] || top[top.length - 1];
    const d = idea?.stats?.observations || 0;
    node = frame(hue, accent, `ИДЕЯ 0${i}`, [
      <div key="t" style={{ fontSize: 78, fontWeight: 800, letterSpacing: -2.5, lineHeight: 1.02, color: "#fff", maxWidth: 930 }}>{ideaName(idea?.title || "")}</div>,
      idea?.oneLiner ? <div key="o" style={{ marginTop: 22, fontSize: 35, fontWeight: 500, lineHeight: 1.38, color: "#c2c2cc", maxWidth: 930 }}>{clip(idea.oneLiner, 140)}</div> : null,
      d ? (
        <div key="d" style={{ marginTop: 28, display: "flex", alignSelf: "flex-start", fontSize: 30, fontWeight: 800, color: accent, border: `2px solid ${accent}`, borderRadius: 999, padding: "12px 26px" }}>
          {`спрос: ${d} ${plural(d, "наблюдение", "наблюдения", "наблюдений")}`}
        </div>
      ) : null,
    ]);
  } else {
    node = frame(hue, accent, "ЧИТАЙ ЦЕЛИКОМ", [
      <div key="t" style={{ fontSize: 70, fontWeight: 800, letterSpacing: -2.5, lineHeight: 1.05, color: "#fff", maxWidth: 930 }}>{`Полный разбор «${cat.name}»`}</div>,
      <div key="s" style={{ marginTop: 22, fontSize: 36, fontWeight: 500, color: "#c2c2cc", maxWidth: 930 }}>{`${apps} приложений · разбор · ${ideas.length} идей`}</div>,
      <div key="u" style={{ marginTop: 34, fontSize: 52, fontWeight: 800, letterSpacing: -1.5, color: accent }}>inApp.pro</div>,
      <div key="c" style={{ marginTop: 10, fontSize: 33, fontWeight: 500, color: "#9a9aa4" }}>Подпишись — впереди новые ниши</div>,
    ]);
  }

  return new ImageResponse(node, {
    width: 1080,
    height: 1080,
    fonts: FONTS,
    headers: { "cache-control": "public, max-age=3600" },
  });
}
