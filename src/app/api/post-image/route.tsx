import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";
import { getCategoryBySlug } from "@/lib/researchCategories";
import { getNicheThesis } from "@/lib/nicheThesis";
import { getSegmentSummary } from "@/lib/segmentSummary";
import { listIdeas } from "@/lib/ideas";
import { hueFromSlug } from "@/lib/categoryGradient";

// Square (1080×1080) carousel slide for a category, for social posts. ?slug=&i=0..3
// 0 = hook cover, 1 = finding #1, 2 = finding #2, 3 = idea to build. Cyrillic via
// the bundled Inter subsets. Avoid em-dash / middle-dot glyphs (not in the subset).

const fontFile = (name: string) => readFileSync(join(process.cwd(), "public/og-fonts", name));
const FONTS = [
  { name: "Inter", data: fontFile("inter-latin-800-normal.woff"), weight: 800 as const, style: "normal" as const },
  { name: "Inter", data: fontFile("inter-cyrillic-800-normal.woff"), weight: 800 as const, style: "normal" as const },
  { name: "Inter", data: fontFile("inter-latin-500-normal.woff"), weight: 500 as const, style: "normal" as const },
  { name: "Inter", data: fontFile("inter-cyrillic-500-normal.woff"), weight: 500 as const, style: "normal" as const },
];
const STAR = "M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z";
const GRAD = "linear-gradient(135deg,#FFA62B 0%,#FF5C8A 35%,#B14DEA 66%,#4CB8F5 100%)";

// Trim to ~max chars on a word boundary, ending on a whole sentence where one
// fits, else a clean word + ellipsis — never a chopped-off word.
function clip(text: string, max: number): string {
  const s = (text || "").trim();
  if (s.length <= max) return s;
  const head = s.slice(0, max);
  const lastStop = Math.max(head.lastIndexOf(". "), head.lastIndexOf("! "), head.lastIndexOf("? "));
  if (lastStop > max * 0.5) return head.slice(0, lastStop + 1);
  const lastSpace = head.lastIndexOf(" ");
  return (lastSpace > 0 ? head.slice(0, lastSpace) : head).replace(/[\s,;:—-]+$/, "") + "…";
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug") || "";
  const i = Math.max(0, Math.min(3, Number(url.searchParams.get("i") || 0)));

  const cat = getCategoryBySlug(slug, "ru");
  const thesis = getNicheThesis(slug, "ru");
  const summary = getSegmentSummary(slug);
  const ideas = listIdeas().filter((x) => x.category === slug);
  if (!cat || !thesis || !summary) return new Response("not found", { status: 404 });

  const h = hueFromSlug(slug);
  const reviews = (summary.reviewsScanned || 5000).toLocaleString("ru-RU");
  const apps = summary.appsCount || 10;
  const pillars = thesis.pillars || [];
  const idea = ideas[0];

  const accent = `hsl(${h} 85% 62%)`;
  const eyebrowColor = `hsl(${h} 80% 66%)`;
  // Same single-hue top bloom as the site's page atmosphere, but Satori-safe:
  // only the smooth top layers (the site's lower radial bands into concentric
  // rings under Satori), over a same-hue near-black base.
  const baseBg = `hsl(${h} 34% 6%)`;
  const atmoBg = [
    `radial-gradient(70% 55% at 50% -8%, hsl(${h} 78% 56% / 0.50), hsl(${h} 62% 40% / 0.18) 40%, transparent 66%)`,
    `radial-gradient(130% 90% at 50% -30%, hsl(${h} 55% 30% / 0.28), transparent 70%)`,
  ].join(", ");

  let eyebrow = "РАЗБОР НИШИ";
  let body: React.ReactNode = null;

  if (i === 0) {
    body = (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
          <div style={{ fontSize: 172, fontWeight: 800, letterSpacing: -6, lineHeight: 0.92, color: "#fff" }}>{reviews}</div>
        </div>
        <div style={{ fontSize: 58, fontWeight: 800, letterSpacing: -2, color: "#fff" }}>отзывов прочитали</div>
        <div style={{ marginTop: 18, fontSize: 40, fontWeight: 500, color: "#c8c8cf" }}>{`${apps} приложений в нише «${cat.name}»`}</div>
        <div style={{ marginTop: 28, fontSize: 36, fontWeight: 500, color: accent }}>что хвалят, на что злятся и что построить</div>
      </div>
    );
  } else if (i === 1 || i === 2) {
    eyebrow = `ВЫВОД 0${i}`;
    const p = pillars[i - 1] || pillars[0];
    body = (
      <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
        <div style={{ fontSize: 64, fontWeight: 800, letterSpacing: -2.5, lineHeight: 1.08, color: "#fff", maxWidth: 920 }}>{p?.title || ""}</div>
        {p?.dek && <div style={{ fontSize: 33, fontWeight: 500, lineHeight: 1.4, color: "#b6b6bd", maxWidth: 920 }}>{clip(p.dek, 230)}</div>}
      </div>
    );
  } else {
    eyebrow = "ЧТО ПОСТРОИТЬ";
    body = (
      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        <div style={{ fontSize: 70, fontWeight: 800, letterSpacing: -2.5, lineHeight: 1.05, color: "#fff", maxWidth: 920 }}>{idea?.title || cat.name}</div>
        {idea?.oneLiner && <div style={{ fontSize: 35, fontWeight: 500, lineHeight: 1.4, color: "#b6b6bd", maxWidth: 920 }}>{clip(idea.oneLiner, 210)}</div>}
        {idea?.stats?.observations ? (
          <div style={{ marginTop: 8, display: "flex", fontSize: 30, fontWeight: 500, color: accent, border: `2px solid ${accent}`, borderRadius: 999, padding: "12px 26px" }}>
            спрос: {idea.stats.observations} наблюдений
          </div>
        ) : null}
      </div>
    );
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: baseBg,
          backgroundImage: atmoBg,
          padding: "76px 76px 60px",
          fontFamily: "Inter",
        }}
      >
        {/* header: logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 56, height: 56, borderRadius: 14, backgroundImage: GRAD }}>
            <svg width="34" height="34" viewBox="0 0 24 24" fill="#fff"><path d={STAR} /></svg>
          </div>
          <div style={{ color: "#fff", fontSize: 40, fontWeight: 800, letterSpacing: -1.5 }}>inApp</div>
        </div>

        {/* content */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: 6, color: eyebrowColor }}>{eyebrow}</div>
          <div style={{ marginTop: 26, display: "flex" }}>{body}</div>
        </div>

        {/* footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ width: 110, height: 6, borderRadius: 999, backgroundImage: GRAD }} />
          <div style={{ color: "#8a8a90", fontSize: 30, fontWeight: 500 }}>inApp.pro</div>
        </div>
      </div>
    ),
    { width: 1080, height: 1080, fonts: FONTS, headers: { "cache-control": "public, max-age=3600" } },
  );
}
