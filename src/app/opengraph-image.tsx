import { ImageResponse } from "next/og";

export const alt = "SiamEZ — Thailand Services Made Easy";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "72px",
          background: "linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 55%, #0f172a 100%)",
          color: "white",
        }}
      >
        <div
          style={{
            fontSize: 28,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: "#facc15",
            fontWeight: 600,
          }}
        >
          SiamEZ
        </div>
        <div
          style={{
            marginTop: 24,
            fontSize: 64,
            fontWeight: 700,
            lineHeight: 1.1,
            maxWidth: 900,
          }}
        >
          Thailand services made easy
        </div>
        <div style={{ marginTop: 28, fontSize: 28, color: "rgba(255,255,255,0.88)", maxWidth: 880 }}>
          Driver&apos;s license, marriage registration, translation, vehicles, and more — for
          foreigners and residents across Thailand.
        </div>
      </div>
    ),
    { ...size }
  );
}
