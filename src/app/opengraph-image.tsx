import { ImageResponse } from "next/og";

// Static branded social/OG card (1200×630), applied site-wide unless a route
// overrides it. No request-time API → Next caches it as a static asset, so the
// small prod box renders it once, not per crawl. Latin-only copy: ImageResponse
// has no Cyrillic font loaded, so Russian text would render as tofu.
export const alt = "inApp — app-niche research from real reviews";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
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
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ color: "#fff", fontSize: 54, fontWeight: 900, letterSpacing: -2.5 }}>inApp</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ color: "#fff", fontSize: 72, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2, maxWidth: 1000 }}>
            Thousands of app reviews into clear conclusions
          </div>
          <div style={{ color: "#9a9a9f", fontSize: 32, fontWeight: 400, maxWidth: 920 }}>
            What users love, what they hate, and which apps are missing — across 65+ niches.
          </div>
        </div>

        <div style={{ display: "flex", gap: 14 }}>
          {["No sign-up", "No paywall", "Just read"].map((t) => (
            <div
              key={t}
              style={{
                display: "flex",
                color: "#e6e6e8",
                fontSize: 26,
                fontWeight: 500,
                padding: "10px 22px",
                borderRadius: 999,
                border: "1px solid #2a2a2e",
              }}
            >
              {t}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
