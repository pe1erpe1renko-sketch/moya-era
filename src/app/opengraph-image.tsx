import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "Моя Эра — шесть систем самопознания";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "linear-gradient(135deg, #03191e 0%, #063f47 100%)", color: "#e6f0ef", fontFamily: "serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 22, height: 22, borderRadius: 11, background: "#7a5da8" }} />
          <div style={{ fontSize: 34, letterSpacing: 4 }}>МОЯ ЭРА</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 76, lineHeight: 1.05 }}>Шесть систем — один человек</div>
          <div style={{ fontSize: 30, color: "#9fbab9", fontFamily: "sans-serif" }}>Матрица судьбы · Натальная карта · Дизайн человека · Нумерология · Таро · Совместимость</div>
        </div>
      </div>
    ),
    size,
  );
}
