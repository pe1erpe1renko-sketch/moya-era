import type { Direction } from "@/lib/directions";

/** Line-only geometric schemes, drawn on a 64x64 viewBox. */
export function Glyph({ name, size = 64 }: { name: Direction["id"]; size?: number | string }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 64 64",
    fill: "none",
    stroke: "var(--text-accent)",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (name) {
    case "matrix":
      return (
        <svg {...common}>
          <rect x="12" y="12" width="40" height="40" />
          <rect x="12" y="12" width="40" height="40" transform="rotate(45 32 32)" />
        </svg>
      );
    case "natal":
      return (
        <svg {...common}>
          <circle cx="32" cy="32" r="24" />
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i * 30 * Math.PI) / 180;
            const x1 = 32 + Math.cos(a) * 24;
            const y1 = 32 + Math.sin(a) * 24;
            const x2 = 32 + Math.cos(a) * 18;
            const y2 = 32 + Math.sin(a) * 18;
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />;
          })}
        </svg>
      );
    case "humandesign":
      return (
        <svg {...common}>
          <path d="M32 12v6M32 24v6M32 36v6M32 48v4M24 21h-4M44 21h4M22 33h-2M44 33h2M24 45h-4M44 45h4" />
          <rect x="27" y="7" width="10" height="6" />
          <path d="M27 18h10l-5 6Z" />
          <rect x="27" y="30" width="10" height="6" />
          <path d="M27 48h10l-5 6Z" />
          <circle cx="17" cy="21" r="4" />
          <circle cx="47" cy="21" r="4" />
          <rect x="13" y="41" width="8" height="8" />
          <rect x="43" y="41" width="8" height="8" />
          <circle cx="32" cy="42" r="3" />
        </svg>
      );
    case "numerology":
      return (
        <svg {...common}>
          <rect x="10" y="10" width="44" height="44" />
          <path d="M24.7 10v44M39.3 10v44M10 24.7h44M10 39.3h44" />
        </svg>
      );
    case "tarot":
      return (
        <svg {...common}>
          <rect x="18" y="8" width="28" height="48" rx="4" />
          <path d="M32 20l8 12-8 12-8-12 8-12Z" />
        </svg>
      );
    case "synastry":
      return (
        <svg {...common}>
          <circle cx="24" cy="32" r="16" />
          <circle cx="40" cy="32" r="16" />
        </svg>
      );
  }
}
