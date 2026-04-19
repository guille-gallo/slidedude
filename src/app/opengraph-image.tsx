import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "slidedude — Animated Code Presentations";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          fontFamily: "sans-serif",
          color: "white",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 784.11 815.53"
            width="64"
            height="64"
          >
            <path
              d="M392.05 0c-20.9,210.08-184.06,378.41-392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93-210.06 184.09-378.37 392.05-407.74-207.98-29.38-371.16-197.69-392.06-407.78z"
              fill="#6ee7b7"
            />
          </svg>
          <div style={{ fontSize: 72, fontWeight: 700 }}>slidedude</div>
        </div>
        <div
          style={{
            fontSize: 28,
            opacity: 0.8,
            maxWidth: "600px",
            textAlign: "center",
          }}
        >
          Animated Code Presentations with Shiki Magic Move
        </div>
      </div>
    ),
    { ...size },
  );
}
