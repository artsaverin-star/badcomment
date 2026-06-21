import { ImageResponse } from "next/og";

// Favicon — the brand mark (gradient rounded square + white star) as a PNG, so it
// renders reliably everywhere (Safari doesn't honour SVG favicons well).
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

const STAR = "M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 15,
          backgroundImage: "linear-gradient(135deg,#FFA62B 0%,#FF5C8A 35%,#B14DEA 66%,#4CB8F5 100%)",
        }}
      >
        <svg width="42" height="42" viewBox="0 0 24 24" fill="#fff">
          <path d={STAR} />
        </svg>
      </div>
    ),
    { ...size },
  );
}
