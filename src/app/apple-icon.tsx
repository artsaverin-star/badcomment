import { ImageResponse } from "next/og";

// Apple touch icon (home-screen). Full-bleed gradient square + star; iOS applies
// its own corner rounding.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const STAR = "M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundImage: "linear-gradient(135deg,#FFA62B 0%,#FF5C8A 35%,#B14DEA 66%,#4CB8F5 100%)",
        }}
      >
        <svg width="118" height="118" viewBox="0 0 24 24" fill="#fff">
          <path d={STAR} />
        </svg>
      </div>
    ),
    { ...size },
  );
}
